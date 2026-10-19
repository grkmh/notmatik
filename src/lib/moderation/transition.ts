import { ContentStatus, Decision } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { Actor, assertTransition } from "./state-machine";

export async function transition(o: {
  materialId: string; to: ContentStatus; actor: Actor;
  actorId?: string | null; note?: string; decision?: Decision;
}) {
  return prisma.$transaction(async (tx) => {
    const m = await tx.material.findUnique({ where: { id: o.materialId }, select: { status: true } });
    if (!m) throw new HttpError(404, "İçerik bulunamadı");
    assertTransition(m.status, o.to, o.actor);

    // Eşzamanlı kararlara karşı: yalnızca durum hâlâ aynıysa güncelle
    const r = await tx.material.updateMany({
      where: { id: o.materialId, status: m.status },
      data: { status: o.to, ...(o.to === "PUBLISHED" ? { publishedAt: new Date() } : {}) },
    });
    if (r.count === 0) throw new HttpError(409, "İçerik başka biri tarafından güncellendi");

    await tx.moderationEvent.create({
      data: { materialId: o.materialId, actorId: o.actorId ?? null, from: m.status, to: o.to, note: o.note },
    });
    if (o.decision && o.actorId) {
      await tx.moderationDecision.create({
        data: { materialId: o.materialId, moderatorId: o.actorId, decision: o.decision, note: o.note },
      });
    }
  });
}
