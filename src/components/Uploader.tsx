"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readTakenAt, toJpegs } from "@/lib/image";

type Item = {
  key: string;
  file: File;
  preview: string | null;
  takenAt: Date | null;
  year: number | null;
  caption: string;
  tags: string[];
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

export function Uploader({ years, players, defaultYear, userId }: { years: number[]; players: { id: string; name: string }[]; defaultYear: number | null; userId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const update = (key: string, patch: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  async function add(files: FileList | null) {
    if (!files) return;
    const added = await Promise.all(
      [...files].map(async (file) => {
        const takenAt = await readTakenAt(file);
        const exifYear = takenAt?.getFullYear();
        const heic = /\.hei[cf]$/i.test(file.name);
        return {
          key: crypto.randomUUID(),
          file,
          preview: heic ? null : URL.createObjectURL(file),
          takenAt,
          year: exifYear && years.includes(exifYear) ? exifYear : defaultYear,
          caption: "",
          tags: [],
          status: "ready" as const,
        };
      }),
    );
    setItems((xs) => [...xs, ...added]);
  }

  async function uploadAll() {
    setBusy(true);
    for (const it of items.filter((x) => x.status === "ready" || x.status === "error")) {
      if (!it.year) {
        update(it.key, { status: "error", error: "Pick a year" });
        continue;
      }
      update(it.key, { status: "uploading", error: undefined });
      try {
        const { full, thumb } = await toJpegs(it.file);
        const path = `${it.year}/${userId}/${crypto.randomUUID()}.jpg`;
        const up = async (p: string, b: Blob) => {
          const { error } = await supabase.storage.from("photos").upload(p, b, { contentType: "image/jpeg", cacheControl: "31536000" });
          if (error) throw error;
        };
        await up(path, full.blob);
        await up(path.replace(/\.jpg$/, "_t.jpg"), thumb.blob);
        const { data, error } = await supabase
          .from("photos")
          .insert({ year: it.year, storage_path: path, taken_at: it.takenAt?.toISOString() ?? null, caption: it.caption || null, width: full.width, height: full.height })
          .select("id")
          .single();
        if (error) throw error;
        if (it.tags.length) {
          const { error: tagErr } = await supabase.from("photo_tags").insert(it.tags.map((player_id) => ({ photo_id: data.id, player_id })));
          if (tagErr) throw tagErr;
        }
        update(it.key, { status: "done" });
      } catch (e) {
        update(it.key, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
      }
    }
    setBusy(false);
    router.refresh();
  }

  const pending = items.filter((x) => x.status !== "done").length;

  return (
    <div className="mt-6 space-y-6">
      <label className="block border-2 border-dashed border-line rounded-lg p-10 text-center cursor-pointer hover:border-gold bg-card">
        <input type="file" accept="image/*,.heic,.heif" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
        <div className="font-display text-2xl">Choose photos</div>
        <p className="text-sm text-muted mt-1">We read the date the photo was taken and file it under that year. You can change it before uploading.</p>
      </label>

      {items.map((it) => {
        const month = it.takenAt?.getMonth();
        const offSeason = month != null && (month < 7 || month > 9);
        return (
          <div key={it.key} className={`flex gap-4 bg-card ring-1 rounded p-3 ${it.status === "error" ? "ring-arcon" : "ring-line"}`}>
            <div className="h-28 w-28 shrink-0 rounded bg-line overflow-hidden flex items-center justify-center text-xs text-muted">
              {it.preview ? <img src={it.preview} alt="" className="h-full w-full object-cover" /> : "HEIC"}
            </div>
            <div className="flex-1 min-w-0 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={it.year ?? ""}
                  onChange={(e) => update(it.key, { year: Number(e.target.value) || null })}
                  disabled={it.status === "done"}
                  className="bg-paper ring-1 ring-line rounded px-2 py-1 num"
                >
                  <option value="">Year?</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <span className="text-muted text-xs">
                  {it.takenAt ? `Taken ${it.takenAt.toLocaleDateString()}` : "No date in photo, pick the year"}
                  {offSeason && " · not September, still from the trip?"}
                </span>
                <span className="ml-auto text-xs">
                  {it.status === "uploading" && "Uploading…"}
                  {it.status === "done" && <span className="text-fairway">✓ Uploaded</span>}
                  {it.status === "error" && <span className="text-arcon">{it.error}</span>}
                </span>
              </div>
              <input
                value={it.caption}
                onChange={(e) => update(it.key, { caption: e.target.value })}
                disabled={it.status === "done"}
                placeholder="Caption (optional)"
                className="w-full bg-paper ring-1 ring-line rounded px-2 py-1"
              />
              <div className="flex flex-wrap gap-1">
                {players.map((p) => {
                  const on = it.tags.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={it.status === "done"}
                      onClick={() => update(it.key, { tags: on ? it.tags.filter((t) => t !== p.id) : [...it.tags, p.id] })}
                      className={`px-2 py-0.5 rounded-full text-xs ring-1 ${on ? "bg-ink text-paper ring-ink" : "ring-line text-muted hover:text-ink"}`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
            {it.status !== "done" && (
              <button onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} className="self-start text-muted hover:text-arcon" aria-label="Remove">
                ✕
              </button>
            )}
          </div>
        );
      })}

      {pending > 0 && (
        <button onClick={uploadAll} disabled={busy} className="bg-ink text-paper px-6 py-3 rounded font-semibold disabled:opacity-50">
          {busy ? "Uploading…" : `Upload ${pending} photo${pending > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
