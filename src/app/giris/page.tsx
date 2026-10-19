import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import Shell from "@/components/Shell";
import { signIn } from "@/auth";
import { btn, input, muted } from "@/lib/ui";

export default async function Giris({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const { hata } = await searchParams;
  async function login(fd: FormData) {
    "use server";
    try {
      await signIn("credentials", { email: String(fd.get("email")), password: String(fd.get("password")), redirectTo: "/" });
    } catch (e) {
      if (e instanceof AuthError) redirect("/giris?hata=1");
      throw e;
    }
  }
  return (
    <Shell>
      <div className="mx-auto max-w-sm">
        <h1 className="font-serif text-2xl font-semibold">Giriş yap</h1>
        {hata && <p role="alert" className="mt-4 rounded bg-red-600/10 p-3 text-sm text-red-700 dark:text-red-400">E-posta veya şifre hatalı. Tekrar dene.</p>}
        <form action={login} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">E-posta<input name="email" type="email" required autoComplete="email" className={`${input} mt-1`} /></label>
          <label className="block text-sm font-medium">Şifre<input name="password" type="password" required autoComplete="current-password" className={`${input} mt-1`} /></label>
          <button className={`${btn} w-full`}>Giriş yap</button>
        </form>
        <p className={`mt-4 text-sm ${muted}`}>Hesabın yok mu? <Link href="/kayit" className="underline">Kayıt ol</Link></p>
      </div>
    </Shell>
  );
}
