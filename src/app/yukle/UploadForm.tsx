"use client";
import { useState } from "react";
import { TYPE_LABELS } from "@/lib/labels";
import { btn, input, muted } from "@/lib/ui";

type UploadResult = { id: string; error?: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{label}<div className="mt-1 font-normal">{children}</div></label>;
}

export default function UploadForm({ maxBytes }: { maxBytes: number }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const maxMb = Math.round(maxBytes / 1048576);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setProgress(0);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Bir dosya seçmelisin.");
      return;
    }
    if (file.size > maxBytes) {
      setError(
        `Dosya çok büyük (${(file.size / 1048576).toFixed(1)} MB). En fazla ${maxMb} MB yükleyebilirsin.`,
      );
      return;
    }

    setBusy(true);
    try {
      // XHR: yükleme yüzdesini gösterebilmek için (fetch upload ilerlemesi vermez).
      const uploaded = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/materials");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          let body: UploadResult | null = null;
          try {
            body = JSON.parse(xhr.responseText) as UploadResult;
          } catch {
            body = null;
          }
          if (xhr.status >= 200 && xhr.status < 300 && body?.id) resolve(body);
          else reject(new Error(body?.error ?? `Yükleme başarısız (HTTP ${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Ağ hatası; bağlantını kontrol et."));
        xhr.send(fd);
      });

      setProgress(100);
      const submit = await fetch(`/api/materials/${uploaded.id}/submit`, { method: "POST" });
      if (!submit.ok) {
        const j = (await submit.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "İncelemeye gönderilemedi");
      }
      form.reset();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setBusy(false);
    }
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
      <Field label={`Dosya (PDF, DOCX veya PPTX, en fazla ${maxMb} MB)`}>
        <input name="file" type="file" required accept=".pdf,.docx,.pptx" className="text-sm" />
      </Field>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" required className="mt-1" />
        <span>Bu materyali paylaşma hakkına sahibim ve telif hakkı ihlali içermediğini onaylıyorum.</span>
      </label>

      {busy && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="h-full bg-blue-700 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className={`mt-1 text-xs ${muted}`}>Yükleniyor… %{progress}</p>
        </div>
      )}

      <button disabled={busy} className={btn}>
        {busy ? `Yükleniyor… %${progress}` : "Yükle ve incelemeye gönder"}
      </button>
    </form>
  );
}
