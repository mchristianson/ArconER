import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionTitle } from "@/components/SectionTitle";
import { PhotoGallery } from "@/components/PhotoGallery";
import { getViewer } from "@/lib/supabase/server";
import { photoUrl, pts, type Photo, type Player, type Team } from "@/lib/data";

type MP = { team: Team; matches: { arcon_pts: number; team2_pts: number; sessions: { year: number } } };

export default async function PlayerPage({ params }: PageProps<"/players/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await getViewer();
  const [{ data: player }, { data: roster }, { data: mps }, { data: tagged }] = await Promise.all([
    supabase.from("players").select("*").eq("id", id).maybeSingle<Player>(),
    supabase.from("roster").select("year, team, tournaments(winner, team2_name)").eq("player_id", id).order("year", { ascending: false })
      .returns<{ year: number; team: Team; tournaments: { winner: string | null; team2_name: string } }[]>(),
    supabase.from("match_players").select("team, matches(arcon_pts, team2_pts, sessions(year))").eq("player_id", id).returns<MP[]>(),
    supabase.from("photo_tags").select("photos(*, photo_tags(players(id, name)))").eq("player_id", id)
      .returns<{ photos: Photo & { photo_tags: { players: { id: string; name: string } }[] } }[]>(),
  ]);
  if (!player) notFound();

  const byYear = new Map<number, { w: number; l: number; h: number; pts: number }>();
  for (const mp of mps ?? []) {
    const m = mp.matches;
    const mine = mp.team === "arcon" ? m.arcon_pts : m.team2_pts;
    const theirs = mp.team === "arcon" ? m.team2_pts : m.arcon_pts;
    const y = byYear.get(m.sessions.year) ?? { w: 0, l: 0, h: 0, pts: 0 };
    if (mine > theirs) y.w++;
    else if (mine < theirs) y.l++;
    else y.h++;
    y.pts += Number(mine);
    byYear.set(m.sessions.year, y);
  }
  const total = [...byYear.values()].reduce((a, y) => ({ w: a.w + y.w, l: a.l + y.l, h: a.h + y.h, pts: a.pts + y.pts }), { w: 0, l: 0, h: 0, pts: 0 });
  const cupWins = (roster ?? []).filter((r) => r.tournaments.winner === r.team).length;
  const photos = (tagged ?? []).map((t) => t.photos).sort((a, b) => b.year - a.year);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/players" className="text-sm text-muted hover:text-ink">← All players</Link>
      <div className="mt-4 flex items-center gap-5">
        {player.photo_path && <img src={photoUrl(player.photo_path, true)} alt="" className="h-24 w-24 rounded-full object-cover ring-2 ring-gold" />}
        <div>
          <h1 className="font-display text-5xl">{player.name}</h1>
          {player.full_name && <p className="text-muted">{player.full_name}</p>}
        </div>
      </div>
      {player.bio && <p className="mt-6 max-w-3xl whitespace-pre-line">{player.bio}</p>}

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Cups played", roster?.length ?? 0],
          ["Cups won", cupWins],
          ["Match record", `${total.w}-${total.l}-${total.h}`],
          ["Points", pts(total.pts)],
        ].map(([l, v]) => (
          <div key={l} className="bg-card ring-1 ring-line rounded p-4">
            <div className="font-display num text-3xl">{v}</div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted mt-1">{l}</div>
          </div>
        ))}
      </div>

      {!!roster?.length && (
        <section className="mt-12">
          <SectionTitle>By Year</SectionTitle>
          <table className="mt-4 w-full text-sm num">
            <thead className="text-left text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2">Year</th>
                <th>Team</th>
                <th>W-L-H</th>
                <th className="text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => {
                const y = byYear.get(r.year);
                return (
                  <tr key={r.year} className="border-t border-line">
                    <td className="py-2">
                      <Link href={`/history/${r.year}`} className="hover:underline">{r.year}</Link>
                      {r.tournaments.winner === r.team && <span className="text-gold"> ★</span>}
                    </td>
                    <td className={r.team === "arcon" ? "text-arcon" : "text-blue"}>{r.team === "arcon" ? "Arcon" : r.tournaments.team2_name}</td>
                    <td>{y ? `${y.w}-${y.l}-${y.h}` : "–"}</td>
                    <td className="text-right">{y ? pts(y.pts) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-12">
        <SectionTitle>Photos</SectionTitle>
        {photos.length ? (
          <PhotoGallery photos={photos} viewerId={profile?.id ?? null} isAdmin={profile?.role === "admin"} showYear />
        ) : (
          <p className="mt-4 text-muted">No tagged photos yet.</p>
        )}
      </section>
    </div>
  );
}
