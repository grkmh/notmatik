import { createHash } from "node:crypto";

const MAX = Number(process.env.MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024);
const SIG = { pdf: [0x25, 0x50, 0x44, 0x46, 0x2d], zip: [0x50, 0x4b, 0x03, 0x04] }; // %PDF-, PK..
const OOXML = "application/vnd.openxmlformats-officedocument.";
const ALLOWED: Record<string, { mime: string; kind: keyof typeof SIG }> = {
  pdf: { mime: "application/pdf", kind: "pdf" },
  pptx: { mime: OOXML + "presentationml.presentation", kind: "zip" },
  docx: { mime: OOXML + "wordprocessingml.document", kind: "zip" },
};

export type Inspect =
  | { ok: true; ext: string; mime: string; size: number; sha256: string }
  | { ok: false; error: string };

// Uzantıya değil, dosyanın ilk baytlarına (magic bytes) bakar.
// Not: zip tabanlı dosyaların iç yapısı (docx/pptx) tarama işçisinde ayrıca doğrulanmalı.
export function inspectUpload(buf: Uint8Array, filename: string): Inspect {
  if (buf.length === 0) return { ok: false, error: "Dosya boş" };
  if (buf.length > MAX) return { ok: false, error: "Dosya çok büyük" };
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const rule = ALLOWED[ext];
  if (!rule) return { ok: false, error: "Desteklenmeyen dosya türü" };
  if (!SIG[rule.kind].every((b, i) => buf[i] === b)) return { ok: false, error: "Dosya içeriği uzantıyla uyuşmuyor" };
  return { ok: true, ext, mime: rule.mime, size: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
}
