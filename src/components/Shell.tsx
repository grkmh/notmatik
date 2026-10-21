import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";

export default async function Shell({ children }: { children: React.ReactNode }) {
  const id = (await auth())?.user?.id;
  const user = id ? await prisma.user.findUnique({ where: { id }, select: { name: true, role: true } }) : null;
  const link = "rounded px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10";
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="border-b border-black/10 dark:border-white/15">
        <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-1 px-4 py-3 text-sm">
          <Link href="/" className="mr-auto font-serif text-lg font-semibold">Ders Kütüphanesi</Link>
          {user ? (
            <>
              <Link href="/yukle" className={link}>Materyal yükle</Link>
              {user.role !== "USER" && <Link href="/admin" className={link}>İnceleme paneli</Link>}
              {user.role === "ADMIN" && <Link href="/admin/kullanicilar" className={link}>Kullanıcılar</Link>}
              <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                <button className={link}>Çıkış yap ({user.name ?? "hesabım"})</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/giris" className={link}>Giriş yap</Link>
              <Link href="/kayit" className={link}>Kayıt ol</Link>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
