import type { Role } from "@prisma/client";
import { HttpError } from "@/lib/http";

const PERMS = {
  USER: ["material:create"],
  MODERATOR: ["material:create", "material:review"],
  ADMIN: ["material:create", "material:review", "material:unpublish", "user:manage", "settings:manage"],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof PERMS)["ADMIN"][number];

export const can = (role: Role, p: Permission) => (PERMS[role] as readonly string[]).includes(p);

// Tek yetki noktası: arayüz sadece butonları gizler, asıl kontrol burada.
export function requirePermission(user: { role: Role }, p: Permission) {
  if (!can(user.role, p)) throw new HttpError(403, "Bu işlem için yetkin yok");
}
