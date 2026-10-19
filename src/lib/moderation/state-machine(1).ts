import { ContentStatus as S } from "@prisma/client";
import { HttpError } from "@/lib/http";

export type Actor = "AUTHOR" | "SYSTEM" | "MODERATOR" | "ADMIN";

const RULES: Array<[S, S, Actor[]]> = [
  [S.DRAFT, S.PENDING_REVIEW, ["AUTHOR"]],
  [S.NEEDS_CHANGES, S.PENDING_REVIEW, ["AUTHOR"]],
  [S.PENDING_REVIEW, S.AI_REVIEW, ["SYSTEM"]],
  [S.PENDING_REVIEW, S.ADMIN_REVIEW, ["SYSTEM"]], // yapay zekâ kapalıyken
  [S.AI_REVIEW, S.ADMIN_REVIEW, ["SYSTEM"]],
  [S.ADMIN_REVIEW, S.PUBLISHED, ["MODERATOR"]],
  [S.ADMIN_REVIEW, S.REJECTED, ["MODERATOR"]],
  [S.ADMIN_REVIEW, S.NEEDS_CHANGES, ["MODERATOR"]],
  [S.PUBLISHED, S.UNPUBLISHED, ["ADMIN"]],
  [S.UNPUBLISHED, S.ADMIN_REVIEW, ["ADMIN"]],
];

export function canTransition(from: S, to: S, actor: Actor) {
  return RULES.some(
    ([f, t, a]) => f === from && t === to && (a.includes(actor) || (actor === "ADMIN" && a.includes("MODERATOR")))
  );
}

export function assertTransition(from: S, to: S, actor: Actor) {
  if (!canTransition(from, to, actor)) throw new HttpError(409, `Geçersiz durum geçişi: ${from} → ${to}`);
}
