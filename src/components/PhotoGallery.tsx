"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deletePhoto } from "@/app/actions";
import { photoUrl, type Photo } from "@/lib/data";

type P = Photo & { photo_tags: { players: { id: string; name: string } }[] };

export function PhotoGallery({ photos, viewerId, isAdmin, showYear = false }: { photos: P[]; viewerId: string | null; isAdmin: boolean; showYear?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const p = open == null ? null : photos[open];

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => Math.min(photos.length - 1, (i ?? 0) + 1));
      if (e.key === "ArrowLeft") setOpen((i) => Math.max(0, (i ?? 0) - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  return (
    <>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {photos.map((ph, i) => (
          <button key={ph.id} onClick={() => setOpen(i)} className="relative aspect-square overflow-hidden rounded bg-line group">
            <img src={photoUrl(ph.storage_path, true)} alt={ph.caption ?? ""} className="h-full w-full object-cover group-hover:scale-105 transition" loading="lazy" />
            {showYear && <span className="absolute left-1 top-1 bg-ink/80 text-paper text-xs px-1.5 py-0.5 rounded num">{ph.year}</span>}
          </button>
        ))}
      </div>
      {p && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <img src={photoUrl(p.storage_path)} alt={p.caption ?? ""} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
          <div className="text-paper px-4 pb-4 text-sm flex flex-wrap items-center gap-x-4 gap-y-1" onClick={(e) => e.stopPropagation()}>
            <span className="num text-paper/60">
              {p.year}
              {p.taken_at && ` · ${new Date(p.taken_at).toLocaleDateString()}`}
            </span>
            {p.caption && <span>{p.caption}</span>}
            {!!p.photo_tags.length && (
              <span className="text-paper/80">
                With{" "}
                {p.photo_tags.map((t, i) => (
                  <span key={t.players.id}>
                    {i > 0 && ", "}
                    <Link href={`/players/${t.players.id}`} className="underline">
                      {t.players.name}
                    </Link>
                  </span>
                ))}
              </span>
            )}
            <span className="ml-auto flex gap-4">
              {(p.uploaded_by === viewerId || isAdmin) && (
                <form action={deletePhoto} onSubmit={(e) => (confirm("Delete this photo?") ? setOpen(null) : e.preventDefault())}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-paper/60 hover:text-[#ff6b7d]">Delete</button>
                </form>
              )}
              <button onClick={() => setOpen(null)} className="text-paper/80 hover:text-paper">
                Close ✕
              </button>
            </span>
          </div>
          <button aria-label="Previous" className="absolute left-2 top-1/2 text-paper/70 text-4xl px-2" onClick={(e) => (e.stopPropagation(), setOpen(Math.max(0, open! - 1)))}>
            ‹
          </button>
          <button aria-label="Next" className="absolute right-2 top-1/2 text-paper/70 text-4xl px-2" onClick={(e) => (e.stopPropagation(), setOpen(Math.min(photos.length - 1, open! + 1)))}>
            ›
          </button>
        </div>
      )}
    </>
  );
}
