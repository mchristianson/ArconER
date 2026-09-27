import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { createClient } from "@/lib/supabase/server";
import { pts } from "@/lib/data";

export const metadata = { title: "Players" };

type Career = { player_id: string; name: string; years_played: number; first_year: number | null; last_year: number | null; points: number; wins: number; losses: number; halves: number };

export default async function Players() {
  const supabase = await createClient();
  const [{ data: careers }, { data: lastTeams }] = await Promise.all([
    supabase.from("player_career").select("*").order("years_played", { ascending: false }).returns<Career[]>(),
    supabase.from("roster").select("player_id, team, year").order("year", { ascending: false }),
  ]);
  const team = new Map<string, string>();
  lastTeams?.forEach((r) => team.has(r.player_id) || team.set(r.player_id, r.team));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <SectionTitle>Players</SectionTitle>
      <p className="mt-3 text-sm text-muted">Match records count 2018 on, which is as far back as the detailed scores go.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {careers?.map((c) => (
          <Link key={c.player_id} href={`/players/${c.player_id}`} className="flex bg-card ring-1 ring-line rounded overflow-hidden hover:ring-gold">
            <div className={`w-1.5 ${team.get(c.player_id) === "arcon" ? "bg-arcon" : team.get(c.player_id) === "838" ? "bg-blue" : "bg-line"}`} />
            <div className="p-4 flex-1">
              <div className="font-display text-2xl">{c.name}</div>
              <div className="text-sm text-muted num">
                {c.years_played ? `${c.years_played} Cup${c.years_played > 1 ? "s" : ""} · ${c.first_year}–${c.last_year}` : "Records needed"}
              </div>
              {c.wins + c.losses + c.halves > 0 && (
                <div className="text-sm mt-1 num">
                  {c.wins}-{c.losses}-{c.halves} · {pts(c.points)} pts
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
