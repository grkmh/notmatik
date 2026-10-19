"use client";
import { useState } from "react";
import { TYPE_LABELS } from "@/lib/labels";
import { btn, input, muted } from "@/lib/ui";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}<div className="mt-1 font-normal">{children}</div></label>;
}

export default function UploadForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/materials", { method: "POST", body: new FormData(e.currentTarget) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Yükleme başarısız");
      const s = await fetch(`/api/materials/${j.id}/submit`, { method: "POST" });
      if (!s.ok) throw new Error((await s.json().catch(() => ({}))).error ?? "İncelemeye gönderilemedi");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally { setBusy(false); }
  }

  if (done) return (
    <div>
      <h1 className="font-serif text-2xl font-semibold">Materyalin incelemeye gönderildi</h1>
      <p className={`mt-2 ${muted}`}>Yönetici onayladığında kütüphanede görünecek.</p>
      <button onClick={() => setDone(false)} className={`${btn} mt-6`}>Başka bir materyal yükle</button>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Materyal yükle</h1>
      {error && <p role="alert" className="rounded bg-red-600/10 p-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
      <Field label="Başlık"><input name="title" required minLength={3} className={input} /></Field>
      <Field label="Açıklama"><textarea name="description" required minLength={10} rows={4} className={input} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ders adı"><input name="courseName" required className={input} /></Field>
        <Field label="Ders kodu (isteğe bağlı)"><input name="courseCode" className={input} /></Field>
        <Field label="Sınıf veya dönem"><input name="gradeOrTerm" required placeholder="Örn. 2. sınıf, Güz" className={input} /></Field>
        <Field label="Akademik yıl (isteğe bağlı)"><input name="academicYear" placeholder="2025-2026" className={input} /></Field>
        <Field label="Üniversite (isteğe bağlı)"><input name="institution" className={input} /></Field>
        <Field label="Fakülte veya bölüm (isteğe bağlı)"><input name="department" className={input} /></Field>
      </div>
      <Field label="İçerik türü">
        <select name="type" required className={input} defaultValue="LECTURE_NOTE">
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Etiketler (virgülle ayır)"><input name="tags" placeholder="integral, türev" className={input} /></Field>
      <Field label="Dosya (PDF, DOCX veya PPTX, en fazla 25 MB)">
        <input name="file" type="file" required accept=".pdf,.docx,.pptx" className="text-sm" />
      </Field>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" required className="mt-1" />
        <span>Bu materyali paylaşma hakkına sahibim ve telif hakkı ihlali içermediğini onaylıyorum.</span>
      </label>
      <button disabled={busy} className={btn}>{busy ? "Yükleniyor…" : "Yükle ve incelemeye gönder"}</button>
    </form>
  );
}
