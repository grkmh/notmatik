import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { transition } from "@/lib/moderation/transition";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const m = await prisma.material.findUnique({ where: { id }, select: { authorId: true } });
    if (!m) throw new HttpError(404, "İçerik bulunamadı");
    if (m.authorId !== user.id) throw new HttpError(403, "Bu içerik sana ait değil");

    await transition({ materialId: id, to: "PENDING_REVIEW", actor: "AUTHOR", actorId: user.id });
    // Faz 3'te burada tarama/OCR/yapay zekâ işi kuyruğa atılır; şimdilik doğrudan yönetici kuyruğuna.
    const next = process.env.AI_REVIEW_ENABLED === "true" ? "AI_REVIEW" : "ADMIN_REVIEW";
    await transition({ materialId: id, to: next, actor: "SYSTEM" });
    return Response.json({ status: next });
  } catch (e) { return errorResponse(e); }
}
