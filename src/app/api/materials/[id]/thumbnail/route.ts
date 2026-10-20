import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { coverPlaceholderSvg, getThumbnail } from "@/lib/pdf/thumbnail";

const svg = (body: string) =>
  new Response(body, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });

// Yayımlanmış materyalde herkes, diğerlerinde yazar ve yetkililer kapak görebilir.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await prisma.material.findUnique({ where: { id }, include: { file: true } });

  if (!m?.file) return svg(coverPlaceholderSvg("Silinmiş materyal", "Materyal", "Bulunamadı"));

  if (m.status !== "PUBLISHED") {
    const uid = (await auth())?.user?.id;
    const user = uid ? await prisma.user.findUnique({ where: { id: uid }, select: { role: true } }) : null;
    const allowed = !!user && (m.authorId === uid || user.role !== "USER");
    if (!allowed) return svg(coverPlaceholderSvg("Silinmiş materyal", "Materyal", "Bulunamadı"));
  }

  if (m.file.mimeType !== "application/pdf") {
    return svg(coverPlaceholderSvg(m.title, m.courseCode ?? m.courseName, "Dosya önizlemesi"));
  }

  try {
    const webp = await getThumbnail(m.file);
    return new Response(webp as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Kapak görseli üretilemedi:", error);
    return svg(coverPlaceholderSvg(m.title, m.courseCode ?? m.courseName));
  }
}
