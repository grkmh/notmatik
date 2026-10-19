import Link from "next/link";
import { redirect } from "next/navigation";
import type { ContentStatus } from "@prisma/client";
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DECISION_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/labels";
import { btnGhost, muted } from "@/lib/ui";
import DecisionButtons from "./DecisionButtons";

const TABS = ["ADMIN_REVIEW", "NEEDS_CHANGES", "PUBLISHED", "REJECTED", "UNPUBLISHED"];

export default async function Admin({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const id = (await auth())?.user?.id;
  if (!id) redirect("/giris");
  const me = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!me || me.role === "USER") redirect("/"); // sayfa kapısı; asıl yetki kontrolü API'de

  const { durum } = await searchParams;
  const status = (durum && TABS.includes(durum) ? durum : "ADMIN_REVIEW") as ContentStatus;
  const items = await prisma.material.findMany({
    where: { status }, orderBy: { createdAt: "asc" }, take: 50,
    include: { author: { select: { name: true, email: true } }, decisions: { orderBy: { createdAt: "desc" }, take: 3 } },
  });

  return (
    <Shell>
      <h1 className="font-serif text-3xl font-semibold">İnceleme paneli</h1>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {TABS.map((t) => (
          <Link key={t} href={`/admin?durum=${t}`} className={`rounded px-3 py-1.5 ${t === status ? "bg-blue-700 text-white" : "border border-black/20 dark:border-white/25"}`}>
            {STATUS_LABELS[t]}
          </Link>
        ))}
      </div>

      {items.length === 0 ? <p className={`mt-10 ${muted}`}>Bu durumda içerik yok.</p> : (
        <ul className="mt-6 space-y-6">
          {items.map((m) => (
            <li key={m.id} className="rounded border border-black/10 p-4 dark:border-white/15">
              <h2 className="font-serif text-lg font-semibold">{m.title}</h2>
              <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
                <span>{m.courseName}{m.courseCode ? ` (${m.courseCode})` : ""}</span>
                <span className={muted}>{TYPE_LABELS[m.type]}</span>
                <span className={muted}>Yükleyen: {m.author.name ?? m.author.email}</span>
                <span className={muted}>{m.createdAt.toLocaleDateString("tr-TR")}</span>
              </p>
              <p className={`mt-2 text-sm ${muted}`}>{m.description}</p>
              {m.decisions.length > 0 && (
                <ul className={`mt-3 space-y-0.5 text-sm ${muted}`}>
                  {m.decisions.map((d) => <li key={d.id}>Önceki karar: {DECISION_LABELS[d.decision]}{d.note ? `, “${d.note}”` : ""}</li>)}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap items-start gap-3">
                <a href={`/api/materials/${m.id}/download`} className={btnGhost}>Dosyayı indir</a>
                <DecisionButtons id={m.id} status={m.status} isAdmin={me.role === "ADMIN"} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
