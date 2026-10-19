import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import Shell from "@/components/Shell";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { btn, input, muted } from "@/lib/ui";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta yaz"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı").max(100),
  name: z.string().trim().max(100),
});

export default async function Kayit({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const { hata } = await searchParams;
  async function register(fd: FormData) {
    "use server";
    const p = Body.safeParse({ email: fd.get("email"), password: fd.get("password"), name: fd.get("name") ?? "" });
    if (!p.success) redirect("/kayit?hata=" + encodeURIComponent(p.error.issues[0]?.message ?? "Geçersiz bilgi"));
    let failed: string | null = null;
    try {
      const passwordHash = await bcrypt.hash(p.data.password, 12);
      await prisma.user.create({ data: { email: p.data.email, name: p.data.name || null, passwordHash } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") failed = "Bu e-posta zaten kayıtlı";
      else throw e;
    }
    if (failed) redirect("/kayit?hata=" + encodeURIComponent(failed));
    await signIn("credentials", { email: p.data.email, password: p.data.password, redirectTo: "/" });
  }
  return (
    <Shell>
      <div className="mx-auto max-w-sm">
        <h1 className="font-serif text-2xl font-semibold">Kayıt ol</h1>
        {hata && <p role="alert" className="mt-4 rounded bg-red-600/10 p-3 text-sm text-red-700 dark:text-red-400">{hata}</p>}
        <form action={register} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Ad<input name="name" autoComplete="name" className={`${input} mt-1`} /></label>
          <label className="block text-sm font-medium">E-posta<input name="email" type="email" required autoComplete="email" className={`${input} mt-1`} /></label>
          <label className="block text-sm font-medium">Şifre (en az 8 karakter)<input name="password" type="password" required minLength={8} autoComplete="new-password" className={`${input} mt-1`} /></label>
          <button className={`${btn} w-full`}>Hesap oluştur</button>
        </form>
        <p className={`mt-4 text-sm ${muted}`}>Zaten hesabın var mı? <Link href="/giris" className="underline">Giriş yap</Link></p>
      </div>
    </Shell>
  );
}
