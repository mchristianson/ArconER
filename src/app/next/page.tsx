import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { SectionTitle } from "@/components/SectionTitle";
import { setRsvp } from "@/app/actions";
import { getViewer } from "@/lib/supabase/server";
import { formatDates, teamName, type Team, type Tournament } from "@/lib/data";

export const metadata = { title: "Next Cup" };

const statusLabel = { in: "In", maybe: "Maybe", out: "Out" } as const;

export default async function Next() {
  const { supabase, profile } = await getViewer();
  const { data: t } = await supabase.from("tournaments").select("*").order("year", { ascending: false }).limit(1).single<Tournament>();
  if (!t) return null;

  const [{ data: schedule }, { data: roster }, { data: rsvps }, { data: players }] = await Promise.all([
    supabase.from("schedule_items").select("*").eq("year", t.year).order("starts_at"),
    supabase.from("roster").select("team, players(id, name)").eq("year", t.year).returns<{ team: Team; players: { id: string; name: string } }[]>(),
    supabase.from("rsvps").select("player_id, status, note").eq("year", t.year),
    supabase.from("players").select("id, name").eq("active", true).order("name"),
  ]);
  const rsvpOf = new Map(rsvps?.map((r) => [r.player_id, r]));
  const mine = profile?.player_id ? rsvpOf.get(profile.player_id) : undefined;
  const dates = formatDates(t);
  const counts = { in: 0, maybe: 0, out: 0 };
  rsvps?.forEach((r) => counts[r.status as keyof typeof counts]++);

  return (
    <>
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="uppercase tracking-[0.3em] text-xs text-gold">The {t.year} ArconEr Cup</p>
          <h1 className="font-display text-5xl sm:text-6xl mt-2">{dates ?? "Dates TBD"}</h1>
          {t.lodging && <p className="mt-3 text-paper/80">{t.lodging}</p>}
          {t.start_date && (
            <div className="mt-6">
              <Countdown to={`${t.start_date}T12:00:00-05:00`} />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-12 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-12">
          <section>
            <SectionTitle>The Details</SectionTitle>
            <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
              <dt className="text-muted uppercase tracking-wider text-xs pt-0.5">Dates</dt>
              <dd>{dates ?? "To be decided"}</dd>
              <dt className="text-muted uppercase tracking-wider text-xs pt-0.5">Lodging</dt>
              <dd>
                {t.lodging ?? "To be decided"}
                {t.lodging_address && (
                  <>
                    <br />
                    <a className="underline" href={`https://maps.google.com/?q=${encodeURIComponent(t.lodging_address)}`} target="_blank" rel="noopener">
                      {t.lodging_address}
                    </a>
                  </>
                )}
              </dd>
              <dt className="text-muted uppercase tracking-wider text-xs pt-0.5">Courses</dt>
              <dd className="whitespace-pre-line">{t.courses ?? "To be decided"}</dd>
            </dl>
            {t.notes && <p className="mt-4 whitespace-pre-line">{t.notes}</p>}
          </section>

          <section>
            <SectionTitle>Schedule</SectionTitle>
            {schedule?.length ? (
              <ol className="mt-4 space-y-3">
                {schedule.map((s) => (
                  <li key={s.id} className="flex gap-4 bg-card ring-1 ring-line rounded p-3">
                    <div className="w-28 shrink-0 text-sm num">
                      <div className="font-semibold">{new Date(s.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Chicago" })}</div>
                      <div className="text-muted">{new Date(s.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-semibold">{s.title}</div>
                      {s.location && <div className="text-muted">{s.location}</div>}
                      {s.details && <div className="mt-1 whitespace-pre-line">{s.details}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-muted">Tee times and dinners will show up here once they&apos;re set.</p>
            )}
          </section>

          {!!roster?.length && (
            <section>
              <SectionTitle>Teams</SectionTitle>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {(["arcon", "838"] as const).map((team) => (
                  <div key={team} className={`rounded p-4 ${team === "arcon" ? "bg-arcon-soft" : "bg-blue-soft text-right"}`}>
                    <div className={`uppercase tracking-[0.2em] text-xs font-semibold ${team === "arcon" ? "text-arcon" : "text-blue"}`}>{teamName(team, t)}</div>
                    <ul className="mt-2 space-y-1">
                      {roster.filter((r) => r.team === team).map((r) => (
                        <li key={r.players.id}>{r.players.name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside>
          <SectionTitle>Who&apos;s In</SectionTitle>
          <p className="mt-3 text-sm text-muted num">
            {counts.in} in · {counts.maybe} maybe · {counts.out} out
          </p>
          {profile?.player_id ? (
            <form action={setRsvp} className="mt-4 bg-card ring-1 ring-line rounded p-4 space-y-3">
              <input type="hidden" name="year" value={t.year} />
              <div className="text-sm font-semibold">Are you in for {t.year}?</div>
              <div className="flex gap-2">
                {(["in", "maybe", "out"] as const).map((s) => (
                  <button
                    key={s}
                    name="status"
                    value={s}
                    className={`flex-1 py-2 rounded text-sm ring-1 ${mine?.status === s ? "bg-ink text-paper ring-ink" : "ring-line hover:ring-ink"}`}
                  >
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
              <input name="note" defaultValue={mine?.note ?? ""} placeholder="Note (arriving Friday, etc.)" className="w-full bg-paper ring-1 ring-line rounded px-2 py-1.5 text-sm" />
            </form>
          ) : (
            <p className="mt-4 text-sm bg-card ring-1 ring-line rounded p-4">
              {profile ? "Once an admin links your account to your player, you can RSVP here." : (
                <>Sign in with Google to RSVP.</>
              )}
            </p>
          )}
          <ul className="mt-4 divide-y divide-line text-sm">
            {players?.map((p) => {
              const r = rsvpOf.get(p.id);
              return (
                <li key={p.id} className="flex items-center gap-2 py-2">
                  <Link href={`/players/${p.id}`} className="hover:underline">{p.name}</Link>
                  {r?.note && <span className="text-xs text-muted truncate">{r.note}</span>}
                  <span className={`ml-auto text-xs font-semibold uppercase tracking-wider ${r?.status === "in" ? "text-fairway" : r?.status === "out" ? "text-arcon" : r ? "text-gold" : "text-line"}`}>
                    {r ? statusLabel[r.status as keyof typeof statusLabel] : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </>
  );
}
