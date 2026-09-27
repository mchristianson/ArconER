"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { deletePhoto, reorderPhotos } from "@/app/actions";
import { photoUrl, type Photo } from "@/lib/data";

type P = Photo & { photo_tags: { players: { id: string; name: string } }[] };

export function PhotoGallery({
  photos: fromServer,
  viewerId,
  isAdmin,
  showYear = false,
  arrangeYear,
}: {
  photos: P[];
  viewerId: string | null;
  isAdmin: boolean;
  showYear?: boolean;
  arrangeYear?: number; // set on a year page for admins: enables cover / reorder controls
}) {
  const [open, setOpen] = useState<number | null>(null);
  // Local order applied optimistically; ids the server no longer has drop out, new ones append.
  const [order, setOrder] = useState<string[] | null>(null);
  const [saving, startSaving] = useTransition();
  const byId = new Map(fromServer.map((ph) => [ph.id, ph]));
  const photos = order ? [...order.flatMap((id) => byId.get(id) ?? []), ...fromServer.filter((ph) => !order.includes(ph.id))] : fromServer;
  const p = open == null ? null : photos[open];

  function move(from: number, to: number) {
    const ids = photos.map((ph) => ph.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    setOrder(ids);
    startSaving(() => reorderPhotos(arrangeYear!, ids));
  }

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
          <div key={ph.id} className="relative">
            <button onClick={() => setOpen(i)} className="block w-full aspect-square overflow-hidden rounded bg-line group">
              <img src={photoUrl(ph.storage_path, true)} alt={ph.caption ?? ""} className="h-full w-full object-cover group-hover:scale-105 transition" loading="lazy" />
            </button>
            {showYear && <span className="absolute left-1 top-1 bg-ink/80 text-paper text-xs px-1.5 py-0.5 rounded num pointer-events-none">{ph.year}</span>}
            {arrangeYear != null && i === 0 && (
              <span className="absolute left-1 top-1 bg-gold text-ink text-xs font-semibold px-1.5 py-0.5 rounded pointer-events-none">★ Cover</span>
            )}
            {arrangeYear != null && (
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 text-sm">
                <button onClick={() => move(i, i - 1)} disabled={i === 0 || saving} aria-label="Move earlier" className="bg-ink/80 text-paper rounded px-2 py-0.5 disabled:opacity-30">
                  ◀
                </button>
                {i > 0 && (
                  <button onClick={() => move(i, 0)} disabled={saving} className="bg-ink/80 text-paper rounded px-2 py-0.5 text-xs disabled:opacity-30">
                    ★ Make cover
                  </button>
                )}
                <button onClick={() => move(i, i + 1)} disabled={i === photos.length - 1 || saving} aria-label="Move later" className="bg-ink/80 text-paper rounded px-2 py-0.5 disabled:opacity-30">
                  ▶
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {arrangeYear != null && photos.length > 1 && (
        <p className="mt-2 text-xs text-muted">{saving ? "Saving order…" : "Admin: ◀ ▶ to reorder. The first photo is the cover on the home page."}</p>
      )}
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
