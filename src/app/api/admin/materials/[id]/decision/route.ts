import { ContentStatus, Decision } from "@prisma/client";
import { z } from "zod";
import { errorResponse, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/policy";
import { transition } from "@/lib/moderation/transition";

const Body = z.object({ decision: z.nativeEnum(Decision), note: z.string().trim().max(2000).optional() });
const TARGET: Record<Decision, ContentStatus> = {
  APPROVE: "PUBLISHED", REJECT: "REJECTED", REQUEST_CHANGES: "NEEDS_CHANGES", UNPUBLISH: "UNPUBLISHED",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = Body.safeParse(await req.json());
    if (!body.success) throw new HttpError(400, "Geçersiz istek");
    const { decision, note } = body.data;

    requirePermission(user, decision === "UNPUBLISH" ? "material:unpublish" : "material:review");
    if ((decision === "REJECT" || decision === "REQUEST_CHANGES") && !note)
      throw new HttpError(400, "Bu karar için açıklama yazmalısın");

    await transition({
      materialId: id, to: TARGET[decision], decision, note,
      actor: user.role === "ADMIN" ? "ADMIN" : "MODERATOR", actorId: user.id,
    });
    return Response.json({ status: TARGET[decision] });
  } catch (e) { return errorResponse(e); }
}
