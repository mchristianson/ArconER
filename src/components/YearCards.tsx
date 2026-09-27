import Link from "next/link";
import { photoUrl, pts, type Tournament } from "@/lib/data";

// One card per Cup, newest first; winner color band, score, cover photo if any.
export function YearCards({ tournaments, covers }: { tournaments: Tournament[]; covers: { year: number; storage_path: string }[] }) {
  const cover = new Map<number, string>();
  covers.forEach((p) => cover.has(p.year) || cover.set(p.year, p.storage_path));
  const thisYear = new Date().getFullYear();

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tournaments
        .filter((t) => t.year <= thisYear)
        .map((t) => {
          const band = t.winner === "arcon" ? "bg-arcon" : t.winner === "838" ? "bg-blue" : "bg-line";
          const img = cover.get(t.year);
          return (
            <Link key={t.year} href={`/history/${t.year}`} className="group bg-card ring-1 ring-line rounded overflow-hidden hover:ring-gold">
              <div className={`h-1.5 ${band}`} />
              {img && <img src={photoUrl(img, true)} alt="" className="h-36 w-full object-cover" loading="lazy" />}
              <div className="p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display num text-3xl">{t.year}</span>
                  {t.arcon_points != null && (
                    <span className="num text-sm">
                      <span className="text-arcon font-semibold">{pts(t.arcon_points)}</span> –{" "}
                      <span className="text-blue font-semibold">{pts(t.team2_points)}</span>
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm">
                  {t.winner === "arcon" && <span className="text-arcon font-semibold">★ Arcon</span>}
                  {t.winner === "838" && <span className="text-blue font-semibold">★ {t.team2_name}</span>}
                  {t.winner === "tie" && <span className="text-muted font-semibold">Tie</span>}
                  {!t.winner && <span className="text-gold">Do you remember this one? →</span>}
                </div>
                {t.lodging && <div className="mt-1 text-xs text-muted truncate">{t.lodging}</div>}
              </div>
            </Link>
          );
        })}
    </div>
  );
}
