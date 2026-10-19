import Link from "next/link";
import type { ContentType, Prisma } from "@prisma/client";
import Shell from "@/components/Shell";
import { prisma } from "@/lib/db";
import { TYPE_LABELS } from "@/lib/labels";
import { btnGhost, input, muted } from "@/lib/ui";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; tur?: string }> }) {
  const { q, tur } = await searchParams;
  const where: Prisma.MaterialWhereInput = {
    status: "PUBLISHED", // herkese açık liste yalnızca yayımlanmış içeriği gösterir
    ...(tur && tur in TYPE_LABELS ? { type: tur as ContentType } : {}),
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" } },
      { courseName: { contains: q, mode: "insensitive" } },
      { courseCode: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ] } : {}),
  };
  const items = await prisma.material.findMany({ where, orderBy: { publishedAt: "desc" }, take: 50 });

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
        <ul className="mt-6">
          {items.map((m) => (
            <li key={m.id} className="grid gap-3 border-b border-black/10 py-5 sm:grid-cols-[7rem_1fr_auto] dark:border-white/15">
              <div className={`text-sm ${muted}`}>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{m.courseCode ?? "Kodsuz"}</div>
                <div>{m.gradeOrTerm}</div>
                {m.academicYear && <div>{m.academicYear}</div>}
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold">{m.title}</h2>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm">
                  <span>{m.courseName}</span>
                  <span className={muted}>{TYPE_LABELS[m.type]}</span>
                  {m.institution && <span className={muted}>{m.institution}</span>}
                </p>
                <p className={`mt-1 line-clamp-2 text-sm ${muted}`}>{m.description}</p>
              </div>
              <div><a href={`/api/materials/${m.id}/download`} className={btnGhost}>İndir</a></div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
