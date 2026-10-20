import Link from "next/link";
import type { ContentType, Prisma } from "@prisma/client";
import Shell from "@/components/Shell";
import { prisma } from "@/lib/db";
import { TYPE_LABELS } from "@/lib/labels";
import { btnGhost, input, muted } from "@/lib/ui";

// Ana sayfa: 6 sütun × 4 satır = 24 defterlik raf.
const PER_PAGE = 24;

type Search = { q?: string; tur?: string; sayfa?: string };

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const { q, tur, sayfa } = await searchParams;
  const page = Math.max(1, Math.floor(Number(sayfa) || 1));

  const where: Prisma.MaterialWhereInput = {
    status: "PUBLISHED", // herkese açık raf yalnızca yayımlanmış içeriği gösterir
    ...(tur && tur in TYPE_LABELS ? { type: tur as ContentType } : {}),
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" } },
      { courseName: { contains: q, mode: "insensitive" } },
      { courseCode: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ] } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.material.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, title: true, courseName: true, courseCode: true,
        type: true, gradeOrTerm: true,
        author: { select: { name: true } },
      },
    }),
    prisma.material.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tur) params.set("tur", tur);
    if (p > 1) params.set("sayfa", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <Shell>
      <h1 className="font-serif text-3xl font-semibold">Ders materyalleri</h1>
      <form className="mt-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Ders adı, kodu veya başlık ara" className={`${input} min-w-0 flex-1`} />
        <select name="tur" defaultValue={tur ?? ""} className={`${input} w-auto`}>
          <option value="">Tüm türler</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className={btnGhost}>Ara</button>
      </form>

      {items.length === 0 ? (
        <p className={`mt-10 ${muted}`}>
          {q || tur ? "Bu aramaya uyan materyal yok. Farklı bir ders adı veya tür dene." : "Henüz yayımlanmış materyal yok. "}
          {!q && !tur && <Link href="/yukle" className="underline">İlk materyali sen yükle.</Link>}
        </p>
      ) : (
        <>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((m) => (
              <li key={m.id}>
                <a href={`/api/materials/${m.id}/download`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[2px] rounded-l-md bg-neutral-900 shadow-[0_2px_10px_rgb(0_0_0/0.18)] ring-1 ring-black/10 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg dark:ring-white/15">
                    {/* eslint-disable-next-line @next/next/no-img-element -- kapaklar API'den gelen dinamik WebP/SVG */}
                    <img
                      src={`/api/materials/${m.id}/thumbnail`}
                      alt={`${m.title} — ilk sayfa`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 to-transparent" />
                    <span className="absolute left-3 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      {TYPE_LABELS[m.type]}
                    </span>
                  </div>
                  <h2 className="mt-2 line-clamp-2 font-serif text-sm font-semibold leading-snug">{m.title}</h2>
                  <p className={`mt-0.5 truncate text-xs ${muted}`}>
                    {m.courseCode ? `${m.courseCode} · ` : ""}{m.courseName}
                  </p>
                  <p className={`truncate text-xs ${muted}`}>
                    {m.gradeOrTerm}{m.author.name ? ` · ${m.author.name}` : ""}
                  </p>
                </a>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-3 text-sm">
              {page > 1 ? (
                <Link href={hrefFor(page - 1)} className={btnGhost}>← Önceki</Link>
              ) : (
                <span className={`${btnGhost} opacity-40`}>← Önceki</span>
              )}
              <span className={muted}>{page} / {totalPages}</span>
              {page < totalPages ? (
                <Link href={hrefFor(page + 1)} className={btnGhost}>Sonraki →</Link>
              ) : (
                <span className={`${btnGhost} opacity-40`}>Sonraki →</span>
              )}
            </nav>
          )}
        </>
      )}
    </Shell>
  );
}
