import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getViewer } from "@/lib/supabase/server";
import { pts, type Player, type Session, type Team, type Tournament } from "@/lib/data";
import * as A from "./actions";

export const metadata = { title: "Admin" };

const tabs = ["users", "tournament", "players", "suggestions"] as const;
const input = "bg-paper ring-1 ring-line rounded px-2 py-1.5 text-sm w-full";
const btn = "bg-ink text-paper px-3 py-1.5 rounded text-sm";
const del = "text-xs text-muted hover:text-arcon";

export default async function Admin({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const tab = (tabs as readonly string[]).includes(String(sp.tab)) ? String(sp.tab) : "users";
  const { supabase, profile } = await getViewer();
  if (profile?.role !== "admin") return <p className="mx-auto max-w-6xl px-4 py-10">Admins only.</p>;
  const { data: players } = await supabase.from("players").select("*").order("name").returns<Player[]>();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <SectionTitle>Admin</SectionTitle>
      <nav className="mt-4 flex gap-2 text-sm">
        {tabs.map((t) => (
          <Link key={t} href={`/admin?tab=${t}`} className={`px-3 py-1.5 rounded capitalize ring-1 ring-line ${t === tab ? "bg-ink text-paper" : ""}`}>
            {t}
          </Link>
        ))}
      </nav>
      <div className="mt-8">
        {tab === "users" && <Users players={players ?? []} />}
        {tab === "tournament" && <TournamentAdmin year={sp.year ? Number(sp.year) : null} players={players ?? []} />}
        {tab === "players" && <Players players={players ?? []} />}
        {tab === "suggestions" && <Suggestions />}
      </div>
    </div>
  );
}

async function Users({ players }: { players: Player[] }) {
  const { supabase } = await getViewer();
  const { data: users } = await supabase.rpc("admin_users");
  type U = { id: string; email: string; display_name: string; avatar_url: string | null; role: string; player_id: string | null; created_at: string };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Approve people by linking them to their player and setting them to member. Only members can post.</p>
      {(users as U[] | null)?.map((u) => (
        <form key={u.id} action={A.updateUser} className={`flex flex-wrap items-center gap-3 bg-card ring-1 rounded p-3 ${u.role === "pending" ? "ring-gold" : "ring-line"}`}>
          <input type="hidden" name="id" value={u.id} />
          {u.avatar_url && <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />}
          <div className="flex-1 min-w-48">
            <div className="font-semibold text-sm">{u.display_name}</div>
            <div className="text-xs text-muted">{u.email}</div>
          </div>
          <select name="player_id" defaultValue={u.player_id ?? ""} className={`${input} w-40`}>
            <option value="">No player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select name="role" defaultValue={u.role} className={`${input} w-32`}>
            <option value="pending">Pending</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button className={btn}>Save</button>
        </form>
      ))}
    </div>
  );
}

async function TournamentAdmin({ year, players }: { year: number | null; players: Player[] }) {
  const { supabase } = await getViewer();
  const { data: all } = await supabase.from("tournaments").select("*").order("year", { ascending: false }).returns<Tournament[]>();
  const t = all?.find((x) => x.year === year) ?? all?.[0];
  if (!t) return null;
  const [{ data: roster }, { data: sessions }, { data: schedule }] = await Promise.all([
    supabase.from("roster").select("team, is_captain, players(id, name)").eq("year", t.year).returns<{ team: Team; is_captain: boolean; players: { id: string; name: string } }[]>(),
    supabase.from("sessions").select("id, label, format, sort, matches(*, match_players(team, players(id, name)))").eq("year", t.year).order("sort").returns<Session[]>(),
    supabase.from("schedule_items").select("*").eq("year", t.year).order("starts_at"),
  ]);
  const onTeam = (team: Team) => (roster ?? []).filter((r) => r.team === team).map((r) => r.players).sort((a, b) => a.name.localeCompare(b.name));
  const nextYear = (all?.[0]?.year ?? new Date().getFullYear()) + 1;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {all?.map((x) => (
          <Link key={x.year} href={`/admin?tab=tournament&year=${x.year}`} className={`num px-2 py-1 rounded ring-1 ring-line ${x.year === t.year ? "bg-ink text-paper" : ""}`}>
            {x.year}
          </Link>
        ))}
        <form action={A.saveTournament}>
          <input type="hidden" name="year" value={nextYear} />
          <input type="hidden" name="team2_name" value="838 Coatings" />
          <button className="px-2 py-1 rounded ring-1 ring-gold text-gold">+ {nextYear}</button>
        </form>
      </div>

      <section>
        <h3 className="font-display text-2xl">{t.year} details</h3>
        <form action={A.saveTournament} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="year" value={t.year} />
          <Field label="Start date"><input type="date" name="start_date" defaultValue={t.start_date ?? ""} className={input} /></Field>
          <Field label="End date"><input type="date" name="end_date" defaultValue={t.end_date ?? ""} className={input} /></Field>
          <Field label="Lodging"><input name="lodging" defaultValue={t.lodging ?? ""} className={input} /></Field>
          <Field label="Lodging address"><input name="lodging_address" defaultValue={t.lodging_address ?? ""} className={input} /></Field>
          <Field label="Courses"><input name="courses" defaultValue={t.courses ?? ""} className={input} /></Field>
          <Field label="Golf GameBook link"><input name="gamebook_url" type="url" defaultValue={t.gamebook_url ?? ""} className={input} /></Field>
          <Field label="Winner">
            <select name="winner" defaultValue={t.winner ?? ""} className={input}>
              <option value="">Unknown / not played yet</option>
              <option value="arcon">Arcon</option>
              <option value="838">{t.team2_name}</option>
              <option value="tie">Tie</option>
            </select>
          </Field>
          <Field label="Second team name">
            <select name="team2_name" defaultValue={t.team2_name} className={input}>
              <option>838 Coatings</option>
              <option>ER Systems</option>
            </select>
          </Field>
          <Field label="Arcon points"><input name="arcon_points" type="number" step="0.5" defaultValue={t.arcon_points ?? ""} className={input} /></Field>
          <Field label={`${t.team2_name} points`}><input name="team2_points" type="number" step="0.5" defaultValue={t.team2_points ?? ""} className={input} /></Field>
          <div className="sm:col-span-2">
            <Field label="Notes (stories, venue history)"><textarea name="notes" rows={4} defaultValue={t.notes ?? ""} className={input} /></Field>
          </div>
          <div><button className={btn}>Save details</button></div>
        </form>
      </section>

      <section>
        <h3 className="font-display text-2xl">Teams</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {(["arcon", "838"] as const).map((team) => (
            <div key={team} className={`rounded p-3 ${team === "arcon" ? "bg-arcon-soft" : "bg-blue-soft"}`}>
              <div className="text-xs uppercase tracking-widest font-semibold">{team === "arcon" ? "Arcon" : t.team2_name}</div>
              <ul className="mt-2 space-y-1 text-sm">
                {onTeam(team).map((p) => (
                  <li key={p.id} className="flex items-center">
                    {p.name}
                    <form action={A.removeRoster} className="ml-auto">
                      <input type="hidden" name="year" value={t.year} />
                      <input type="hidden" name="player_id" value={p.id} />
                      <button className={del}>Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <form action={A.addRoster} className="mt-3 flex flex-wrap gap-2 items-center">
          <input type="hidden" name="year" value={t.year} />
          <select name="player_id" className={`${input} w-44`}>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select name="team" className={`${input} w-40`}>
            <option value="arcon">Arcon</option>
            <option value="838">{t.team2_name}</option>
          </select>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" name="is_captain" /> Captain</label>
          <button className={btn}>Add to team</button>
        </form>
      </section>

      <section>
        <h3 className="font-display text-2xl">Matches</h3>
        <p className="text-sm text-muted">Enter results from Golf GameBook. Result strings go on the side that won that nine (e.g. &quot;2 &amp; 1&quot;), &quot;AS&quot; on both if halved. Each match is worth 3 points.</p>
        {sessions?.map((s) => (
          <div key={s.id} className="mt-4 bg-card ring-1 ring-line rounded p-3">
            <div className="flex items-center">
              <span className="font-semibold">{s.label}</span>
              <span className="text-muted text-sm ml-2">{s.format}</span>
              <form action={A.deleteSession} className="ml-auto">
                <input type="hidden" name="id" value={s.id} />
                <button className={del}>Delete session</button>
              </form>
            </div>
            <ul className="mt-2 text-sm divide-y divide-line">
              {[...s.matches].sort((a, b) => a.sort - b.sort).map((m) => (
                <li key={m.id} className="flex items-center gap-2 py-1.5 num">
                  <span className="text-arcon">{m.match_players.filter((x) => x.team === "arcon").map((x) => x.players.name).join(" / ")}</span>
                  <span className="text-muted">{pts(m.arcon_pts)}–{pts(m.team2_pts)}</span>
                  <span className="text-blue">{m.match_players.filter((x) => x.team === "838").map((x) => x.players.name).join(" / ")}</span>
                  <form action={A.deleteMatch} className="ml-auto">
                    <input type="hidden" name="id" value={m.id} />
                    <button className={del}>Delete</button>
                  </form>
                </li>
              ))}
            </ul>
            <details className="mt-2">
              <summary className="text-sm cursor-pointer text-gold">+ Add match</summary>
              <form action={A.addMatch} className="mt-2 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="session_id" value={s.id} />
                <input type="hidden" name="sort" value={s.matches.length} />
                {(["arcon", "838"] as const).map((team) => {
                  const k = team === "arcon" ? "arcon" : "team2";
                  return (
                    <div key={team} className={`rounded p-2 space-y-2 ${team === "arcon" ? "bg-arcon-soft" : "bg-blue-soft"}`}>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {(onTeam(team).length ? onTeam(team) : players).map((p) => (
                          <label key={p.id} className="flex items-center gap-1"><input type="checkbox" name={`${k}_players`} value={p.id} />{p.name}</label>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <input name={`${k}_front`} placeholder="Front" className={input} />
                        <input name={`${k}_back`} placeholder="Back" className={input} />
                        <input name={`${k}_total`} placeholder="Total" className={input} />
                        <input name={`${k}_pts`} type="number" step="0.5" min="0" max="3" placeholder="Pts" required className={input} />
                      </div>
                    </div>
                  );
                })}
                <div><button className={btn}>Add match</button></div>
              </form>
            </details>
          </div>
        ))}
        <form action={A.addSession} className="mt-4 flex flex-wrap gap-2 items-center">
          <input type="hidden" name="year" value={t.year} />
          <input type="hidden" name="sort" value={sessions?.length ?? 0} />
          <input name="label" required placeholder="Label (Thursday, Singles…)" className={`${input} w-56`} />
          <select name="format" className={`${input} w-44`}>
            <option>4-ball</option>
            <option>2-man scramble</option>
            <option>singles</option>
            <option>alternate shot</option>
          </select>
          <button className={btn}>Add session</button>
        </form>
      </section>

      <section>
        <h3 className="font-display text-2xl">Schedule</h3>
        <ul className="mt-3 text-sm divide-y divide-line">
          {schedule?.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-1.5">
              <span className="num w-44">{new Date(s.starts_at).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              <span className="font-semibold">{s.title}</span>
              <span className="text-muted">{s.location}</span>
              <form action={A.deleteScheduleItem} className="ml-auto">
                <input type="hidden" name="id" value={s.id} />
                <button className={del}>Delete</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={A.addScheduleItem} className="mt-3 grid gap-2 sm:grid-cols-[12rem_1fr_1fr_auto] items-center">
          <input type="hidden" name="year" value={t.year} />
          <input type="datetime-local" name="starts_at" required className={input} />
          <input name="title" required placeholder="Tee time: 4-ball" className={input} />
          <input name="location" placeholder="Hayward Golf Club" className={input} />
          <button className={btn}>Add</button>
          <textarea name="details" placeholder="Details (optional)" rows={2} className={`${input} sm:col-span-4`} />
        </form>
      </section>
    </div>
  );
}

function Players({ players }: { players: Player[] }) {
  const row = (p?: Player) => (
    <form key={p?.id ?? "new"} action={A.savePlayer} className="grid gap-2 sm:grid-cols-[10rem_12rem_1fr_auto_auto] items-start bg-card ring-1 ring-line rounded p-3">
      {p && <input type="hidden" name="id" value={p.id} />}
      <input name="name" required defaultValue={p?.name} placeholder="Nickname" className={input} />
      <input name="full_name" defaultValue={p?.full_name ?? ""} placeholder="Full name" className={input} />
      <textarea name="bio" defaultValue={p?.bio ?? ""} placeholder="Bio / fun facts" rows={1} className={input} />
      <label className="text-sm flex items-center gap-1 pt-1.5"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Active</label>
      <button className={btn}>{p ? "Save" : "Add player"}</button>
    </form>
  );
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Active players show up on the RSVP list.</p>
      {row()}
      {players.map((p) => row(p))}
    </div>
  );
}

async function Suggestions() {
  const { supabase } = await getViewer();
  const { data } = await supabase
    .from("edit_suggestions")
    .select("id, year, field, proposed_value, reason, status, created_at, profiles!edit_suggestions_author_fkey(display_name)")
    .order("status")
    .order("created_at", { ascending: false })
    .returns<{ id: string; year: number; field: string; proposed_value: string; reason: string | null; status: string; created_at: string; profiles: { display_name: string } }[]>();
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Approving marks a suggestion done. Make the change itself on the Tournament tab.</p>
      {!data?.length && <p className="text-muted">No suggestions yet.</p>}
      {data?.map((s) => (
        <div key={s.id} className={`flex flex-wrap items-center gap-3 bg-card ring-1 rounded p-3 text-sm ${s.status === "open" ? "ring-gold" : "ring-line opacity-60"}`}>
          <Link href={`/admin?tab=tournament&year=${s.year}`} className="num font-semibold underline">{s.year}</Link>
          <span className="capitalize text-muted">{s.field}</span>
          <span className="flex-1 min-w-48">
            {s.proposed_value}
            {s.reason && <span className="text-muted"> · {s.reason}</span>}
            <span className="text-muted"> · {s.profiles.display_name}</span>
          </span>
          {s.status === "open" ? (
            <>
              <form action={A.reviewSuggestion}><input type="hidden" name="id" value={s.id} /><button name="status" value="approved" className={btn}>Approve</button></form>
              <form action={A.reviewSuggestion}><input type="hidden" name="id" value={s.id} /><button name="status" value="rejected" className="ring-1 ring-line px-3 py-1.5 rounded">Reject</button></form>
            </>
          ) : (
            <span className="capitalize">{s.status}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs uppercase tracking-wider text-muted space-y-1">
      <span>{label}</span>
      {children}
    </label>
  );
}
