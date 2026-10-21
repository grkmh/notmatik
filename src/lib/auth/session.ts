import { auth } from "@/auth"; // Auth.js yapılandırması (sıradaki adım)
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";

// Rol ve onay durumu her istekte DB'den okunur: yetki geri alındığında anında etkili olur.
export async function requireUser() {
  const s = await auth();
  if (!s?.user?.id) throw new HttpError(401, "Giriş gerekli");
  const user = await prisma.user.findUnique({ where: { id: s.user.id }, select: { id: true, role: true, approved: true } });
  if (!user || !user.approved) throw new HttpError(401, "Giriş gerekli");
  return user;
}
