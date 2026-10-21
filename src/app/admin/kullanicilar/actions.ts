"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/policy";

const LIST = "/admin/kullanicilar";

async function requireAdmin() {
  const id = (await auth())?.user?.id;
  if (!id) redirect("/giris");
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) redirect("/giris");
  requirePermission(user, "user:manage"); // yalnızca ADMIN
  return user;
}

export async function approveUser(fd: FormData) {
  await requireAdmin();
  await prisma.user.update({ where: { id: String(fd.get("id")) }, data: { approved: true } });
  revalidatePath(LIST);
}

export async function deleteUser(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  if (id === admin.id) redirect(`${LIST}?hata=${encodeURIComponent("Kendi hesabını silemezsin")}`);
  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    redirect(`${LIST}?hata=${encodeURIComponent("Kullanıcı silinemedi (yüklediği materyaller olabilir)")}`);
  }
  revalidatePath(LIST);
}

const NewUser = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta yaz"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı").max(100),
  role: z.enum(["USER", "MODERATOR", "ADMIN"]),
});

export async function addUser(fd: FormData) {
  await requireAdmin();
  const p = NewUser.safeParse({
    name: fd.get("name") ?? "",
    email: fd.get("email"),
    password: fd.get("password"),
    role: fd.get("role") ?? "USER",
  });
  if (!p.success) redirect(`${LIST}?hata=${encodeURIComponent(p.error.issues[0]?.message ?? "Geçersiz bilgi")}`);

  const passwordHash = await bcrypt.hash(p.data.password, 12);
  try {
    // Elle eklenen kullanıcı onaylı açılır.
    await prisma.user.create({
      data: { email: p.data.email, name: p.data.name || null, passwordHash, role: p.data.role, approved: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      redirect(`${LIST}?hata=${encodeURIComponent("Bu e-posta zaten kayıtlı")}`);
    throw e;
  }
  revalidatePath(LIST);
  redirect(`${LIST}?ok=${encodeURIComponent("Kullanıcı eklendi")}`);
}
