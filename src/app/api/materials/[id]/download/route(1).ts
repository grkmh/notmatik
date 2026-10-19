import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { auth } from "@/auth";
import { signedDownloadUrl } from "@/lib/storage";

// Ziyaretçi yalnızca yayımlanmış içeriği indirebilir; yazar ve yetkililer kendi/tüm içeriklere erişir.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const m = await prisma.material.findUnique({ where: { id }, include: { file: true } });
    if (!m?.file) throw new HttpError(404, "Bulunamadı");

    if (m.status !== "PUBLISHED") {
      const uid = (await auth())?.user?.id;
      const u = uid ? await prisma.user.findUnique({ where: { id: uid }, select: { role: true } }) : null;
      const allowed = !!u && (m.authorId === uid || u.role !== "USER");
      if (!allowed) throw new HttpError(404, "Bulunamadı"); // varlığı da sızdırma
    }
    return Response.redirect(await signedDownloadUrl(m.file.storageKey), 302);
  } catch (e) { return errorResponse(e); }
}
