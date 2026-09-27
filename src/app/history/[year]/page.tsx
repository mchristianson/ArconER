import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchCard } from "@/components/MatchCard";
import { Scoreboard } from "@/components/Scoreboard";
import { SectionTitle } from "@/components/SectionTitle";
import { PhotoGallery } from "@/components/PhotoGallery";
import { Comments } from "@/components/Comments";
import { SuggestEdit } from "@/components/SuggestEdit";
import { getViewer } from "@/lib/supabase/server";
import { formatDates, photoUrl, teamName, type Photo, type Session, type Team, type Tournament } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/history/[year]">) {
  const { year } = await params;
  return { title: `${year}` };
}

export default async function YearPage({ params }: PageProps<"/history/[year]">) {
  const year = Number((await params).year);
  if (!Number.isInteger(year)) notFound();
  const { supabase, profile } = await getViewer();

  const [{ data: t }, { data: roster }, { data: sessions }, { data: photos }, { data: suggestions }] = await Promise.all([
    supabase.from("tournaments").select("*").eq("year", year).maybeSingle<Tournament>(),
    supabase.from("roster").select("team, is_captain, players(id, name)").eq("year", year).returns<{ team: Team; is_captain: boolean; players: { id: string; name: string } }[]>(),
    supabase
      .from("sessions")
      .select("id, label, format, sort, matches(*, match_players(team, players(id, name)))")
      .eq("year", year)
      .order("sort")
      .returns<Session[]>(),
    supabase.from("photos").select("*, photo_tags(players(id, name))").eq("year", year).order("sort", { nullsFirst: false }).order("taken_at", { nullsFirst: false }).returns<(Photo & { photo_tags: { players: { id: string; name: string } }[] })[]>(),
    supabase.from("edit_suggestions").select("id, field, proposed_value, status").eq("year", year).eq("status", "open"),
  ]);
  if (!t) notFound();

  const byTeam = (team: Team) => (roster ?? []).filter((r) => r.team === team).sort((a, b) => a.players.name.localeCompare(b.players.name));
  const canPost = profile?.role === "member" || profile?.role === "admin";
  const dates = formatDates(t);

  const cover = photos?.[0];
  const subtitle = [dates, t.lodging, t.courses].filter(Boolean).join(" · ") || "Hayward, Wisconsin";
  const link = cover ? "text-paper/70 hover:text-paper" : "text-muted hover:text-ink";
  const yearNav = (
    <div className="flex items-center justify-between text-sm">
      <Link href={`/history/${year - 1}`} className={link}>← {year - 1}</Link>
      <Link href="/#history" className={link}>All years</Link>
      <Link href={`/history/${year + 1}`} className={link}>{year + 1} →</Link>
    </div>
  );

  return (
    <>
      {cover && (
        // The cover (usually the group photo) leads the page, shown whole so nobody gets cropped out.
        <section className="bg-ink text-paper">
          <div className="mx-auto max-w-6xl px-4 pt-6 pb-10">
            {yearNav}
            <a href="#photos" className="block mt-5">
              <img
                src={photoUrl(cover.storage_path)}
                alt={cover.caption ?? `The ${year} crew`}
                width={cover.width ?? undefined}
                height={cover.height ?? undefined}
                className="mx-auto max-h-[72vh] w-auto h-auto rounded shadow-2xl ring-1 ring-paper/10"
              />
            </a>
            {cover.caption && <p className="mt-3 text-center text-sm text-paper/70">{cover.caption}</p>}
            <h1 className="font-display num text-6xl sm:text-7xl mt-8 text-center">{year}</h1>
            <p className="mt-2 text-paper/70 text-center">{subtitle}</p>
          </div>
          <div className="h-1 flex">
            <div className="flex-1 bg-arcon" />
            <div className="flex-1 bg-blue" />
          </div>
        </section>
      )}
      <div className="mx-auto max-w-6xl px-4 py-10">
        {!cover && (
          <>
            {yearNav}
            <h1 className="font-display num text-6xl sm:text-7xl mt-6">{year}</h1>
            <p className="mt-2 text-muted">{subtitle}</p>
          </>
        )}

        <div className={cover ? "" : "mt-6"}>
          {t.arcon_points != null ? (
            <Scoreboard t={t} />
          ) : t.winner ? (
            <div className={`rounded-md text-white text-center py-8 ${t.winner === "arcon" ? "bg-arcon" : t.winner === "838" ? "bg-blue" : "bg-muted"}`}>
              <div className="uppercase tracking-[0.2em] text-xs">Cup winner</div>
              <div className="font-display text-5xl mt-2">{t.winner === "tie" ? "Tie" : teamName(t.winner, t)}</div>
            </div>
          ) : (
            <div className="rounded-md bg-card ring-1 ring-gold/60 p-6 sm:p-8">
              <div className="font-display text-3xl">Do you remember {year}?</div>
              <p className="mt-2 text-muted max-w-2xl">
                We don&apos;t have the results for this one. Who won? Where did you stay? Who played? Share a memory below or upload
                photos from that trip. Photos often settle the argument.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href="#memories" className="bg-ink text-paper px-4 py-2 rounded text-sm">Share a memory</a>
                <Link href={`/upload?year=${year}`} className="ring-1 ring-ink px-4 py-2 rounded text-sm">Upload photos</Link>
              </div>
            </div>
          )}
        </div>

        {t.gamebook_url && (
          <p className="mt-3 text-sm">
            <a href={t.gamebook_url} className="underline" target="_blank" rel="noopener">View scorecards on Golf GameBook ↗</a>
          </p>
        )}

        {t.notes && <p className="mt-6 whitespace-pre-line max-w-3xl">{t.notes}</p>}

        {!!roster?.length && (
          <section className="mt-12">
            <SectionTitle>Teams</SectionTitle>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {(["arcon", "838"] as const).map((team) => (
                <div key={team} className={`rounded p-4 ${team === "arcon" ? "bg-arcon-soft" : "bg-blue-soft"}`}>
                  <div className={`uppercase tracking-[0.2em] text-xs font-semibold ${team === "arcon" ? "text-arcon" : "text-blue text-right"}`}>
                    {teamName(team, t)}
                  </div>
                  <ul className={`mt-2 space-y-1 ${team === "838" ? "text-right" : ""}`}>
                    {byTeam(team).map((r) => (
                      <li key={r.players.id}>
                        <Link href={`/players/${r.players.id}`} className="hover:underline">
                          {r.players.name}
                        </Link>
                        {r.is_captain && <span className="text-xs text-muted"> (C)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {sessions?.map((s) => (
          <section key={s.id} className="mt-12">
            <SectionTitle>
              {s.label}
              {s.label.toLowerCase() !== s.format && <span className="text-muted text-xl"> · {s.format}</span>}
            </SectionTitle>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {[...s.matches].sort((a, b) => a.sort - b.sort).map((m) => (
                <MatchCard key={m.id} m={m} />
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              <SectionTitle id="photos">Photos</SectionTitle>
            </div>
            {canPost && (
              <Link href={`/upload?year=${year}`} className="bg-ink text-paper px-4 py-2 rounded text-sm shrink-0 mb-3">
                Upload
              </Link>
            )}
          </div>
          {photos?.length ? (
            <PhotoGallery photos={photos} viewerId={profile?.id ?? null} isAdmin={profile?.role === "admin"} arrangeYear={profile?.role === "admin" ? year : undefined} />
          ) : (
            <p className="mt-4 text-muted">No photos yet{canPost ? ". Be the first to add one." : ". Sign in to add some."}</p>
          )}
        </section>

        <section className="mt-12 grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <SectionTitle id="memories">Memories</SectionTitle>
            <Comments year={year} profile={profile} />
          </div>
          <div>
            <SectionTitle>Fix the Record</SectionTitle>
            <SuggestEdit year={year} canPost={canPost} open={suggestions ?? []} />
          </div>
        </section>
      </div>
    </>
  );
}
