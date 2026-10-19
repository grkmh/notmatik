"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn, btnGhost, input } from "@/lib/ui";

export default function DecisionButtons({ id, status, isAdmin }: { id: string; status: string; isAdmin: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(decision: string) {
    setBusy(true); setError("");
    const r = await fetch(`/api/admin/materials/${id}/decision`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, note }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "İşlem başarısız");
    router.refresh();
  }

  const review = status === "ADMIN_REVIEW";
  const canUnpublish = status === "PUBLISHED" && isAdmin;
  if (!review && !canUnpublish) return null;

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={input}
        placeholder="Açıklama (ret ve düzeltme isteğinde zorunlu)" />
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {review && <>
          <button disabled={busy} onClick={() => send("APPROVE")} className={btn}>Onayla ve yayımla</button>
          <button disabled={busy} onClick={() => send("REQUEST_CHANGES")} className={btnGhost}>Düzeltme iste</button>
          <button disabled={busy} onClick={() => send("REJECT")} className={btnGhost}>Reddet</button>
        </>}
        {canUnpublish && <button disabled={busy} onClick={() => send("UNPUBLISH")} className={btnGhost}>Yayından kaldır</button>}
      </div>
    </div>
  );
}
