import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { createClient } from "@/lib/supabase/server";
import { photoUrl, pts, type Tournament } from "@/lib/data";

export const metadata = { title: "History" };

export default async function History() {
  const supabase = await createClient();
  const [{ data: tournaments }, { data: covers }] = await Promise.all([
    supabase.from("tournaments").select("*").order("year", { ascending: false }).returns<Tournament[]>(),
    supabase.from("photos").select("year, storage_path").order("created_at"),
  ]);
  const cover = new Map<number, string>();
  covers?.forEach((p) => cover.has(p.year) || cover.set(p.year, p.storage_path));
  const thisYear = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <SectionTitle>Every Cup Since 2001</SectionTitle>
      <p className="mt-3 text-muted max-w-2xl">
        Patrick&apos;s records start in 2014. For earlier years, share what you remember and upload old photos so we can fill in
        the gaps.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(tournaments ?? [])
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
    </div>
  );
}
