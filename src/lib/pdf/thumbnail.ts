import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { getObject } from "@/lib/storage";

// pdf.js tarayıcı API'lerine ihtiyaç duyar; Node tarafında bu üç global'i sağlıyoruz.
const globals = globalThis as Record<string, unknown>;
globals.DOMMatrix ??= DOMMatrix;
globals.ImageData ??= ImageData;
globals.Path2D ??= Path2D;

const WIDTH = 360;
const QUALITY = 82;
const CACHE_DIR = path.join(process.cwd(), ".local-storage", "thumbnails");

let pdfjsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | undefined;
const loadPdfjs = () => (pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs"));

// Aynı PDF için eşzamanlı istekleri tek işe indir, CPU'yu en fazla 3 işle sınırla.
const inFlight = new Map<string, Promise<Uint8Array>>();
let active = 0;
const waiting: Array<() => void> = [];

async function acquire() {
  if (active >= 3) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
}

function release() {
  active--;
  waiting.shift()?.();
}

export async function renderFirstPage(data: Uint8Array): Promise<Uint8Array> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data, useSystemFonts: true });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: WIDTH / page.getViewport({ scale: 1 }).width });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
      background: "#ffffff",
    }).promise;
    return await canvas.encode("webp", QUALITY);
  } finally {
    await task.destroy();
  }
}

/** PDF'in ilk sayfasını WebP olarak döner; sonuç `sha256` ile diskte önbelleklenir. */
export async function getThumbnail(file: { storageKey: string; sha256: string }): Promise<Uint8Array> {
  const cacheFile = path.join(CACHE_DIR, `${file.sha256}.webp`);
  const cached = await readFile(cacheFile).catch(() => null);
  if (cached) return new Uint8Array(cached);

  const running = inFlight.get(file.sha256);
  if (running) return running;

  const job = (async () => {
    await acquire();
    try {
      const pdf = await getObject(file.storageKey);
      const webp = await renderFirstPage(pdf);
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(cacheFile, webp);
      return webp;
    } finally {
      release();
    }
  })();

  inFlight.set(file.sha256, job);
  job.finally(() => inFlight.delete(file.sha256));
  return job;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** PDF olmayan veya önizlemesi üretilemeyen dosyalar için defter kapağı görünümlü SVG. */
export function coverPlaceholderSvg(title: string, label: string, heading = "Önizleme yok") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="480" viewBox="0 0 ${WIDTH} 480">
  <defs>
    <linearGradient id="cover" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3f4a5a"/><stop offset="1" stop-color="#141a24"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="480" fill="url(#cover)"/>
  <rect width="10" height="480" fill="#000" opacity=".28"/>
  <rect x="26" y="26" width="${WIDTH - 52}" height="428" fill="none" stroke="#ffffff" stroke-opacity=".18" rx="2"/>
  <text x="${WIDTH / 2}" y="236" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="#e6edf3">${escapeXml(label)}</text>
  <text x="${WIDTH / 2}" y="268" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" fill="#a7b3c2">${escapeXml(clip(title, 42))}</text>
  <text x="${WIDTH / 2}" y="404" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" letter-spacing="2" fill="#7d8a99">${escapeXml(heading.toUpperCase())}</text>
</svg>`;
}
