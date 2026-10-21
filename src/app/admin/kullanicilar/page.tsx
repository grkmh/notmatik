import Link from "next/link";
import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { btn, btnGhost, input, muted } from "@/lib/ui";
import { addUser, approveUser, deleteUser } from "./actions";

export default async function Kullanicilar({ searchParams }: { searchParams: Promise<{ hata?: string; ok?: string }> }) {
  const id = (await auth())?.user?.id;
  if (!id) redirect("/giris");
  const me = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (me?.role !== "ADMIN") redirect("/"); // sayfa kapısı; asıl kontrol action'larda

  const { hata, ok } = await searchParams;
  const users = await prisma.user.findMany({
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
    select: { id: true, email: true, name: true, role: true, approved: true, createdAt: true },
  });
  const pending = users.filter((u) => !u.approved);
  const active = users.filter((u) => u.approved);

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-semibold">Kullanıcılar</h1>
        <Link href="/admin" className={btnGhost}>← İnceleme paneline dön</Link>
      </div>

      {ok && <p className="mt-4 rounded bg-emerald-600/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">{ok}</p>}
      {hata && <p role="alert" className="mt-4 rounded bg-red-600/10 p-3 text-sm text-red-700 dark:text-red-400">{hata}</p>}

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold">Onay bekleyenler ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className={`mt-2 text-sm ${muted}`}>Onay bekleyen kullanıcı yok.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="text-sm">
                  <div className="font-medium">{u.name ?? "İsimsiz"}</div>
                  <div className={muted}>
                    {u.email} · {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={approveUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className={btn}>Onayla</button>
                  </form>
                  <form action={deleteUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className={btnGhost}>Reddet</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">Yeni kullanıcı ekle</h2>
        <form action={addUser} className="mt-3 grid gap-3 rounded border border-black/10 p-4 sm:grid-cols-2 dark:border-white/15">
          <label className="text-sm font-medium">Ad<input name="name" className={`${input} mt-1`} /></label>
          <label className="text-sm font-medium">E-posta<input name="email" type="email" required className={`${input} mt-1`} /></label>
          <label className="text-sm font-medium">Şifre<input name="password" type="password" required minLength={8} className={`${input} mt-1`} /></label>
          <label className="text-sm font-medium">
            Rol
            <select name="role" defaultValue="USER" className={`${input} mt-1`}>
              <option value="USER">Kullanıcı</option>
              <option value="MODERATOR">Moderatör</option>
              <option value="ADMIN">Yönetici</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button className={btn}>Kullanıcıyı ekle</button>
          </div>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">Aktif kullanıcılar ({active.length})</h2>
        <ul className="mt-3 space-y-2">
          {active.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-black/10 p-3 text-sm dark:border-white/15">
              <div>
                <span className="font-medium">{u.name ?? "İsimsiz"}</span>
                <span className={muted}> · {u.email} · {u.role}</span>
              </div>
              <form action={deleteUser}>
                <input type="hidden" name="id" value={u.id} />
                <button className={btnGhost}>Sil</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
