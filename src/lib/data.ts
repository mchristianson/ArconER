export type Team = "arcon" | "838";

export type Tournament = {
  year: number;
  start_date: string | null;
  end_date: string | null;
  lodging: string | null;
  lodging_address: string | null;
  courses: string | null;
  notes: string | null;
  winner: Team | "tie" | null;
  arcon_points: number | null;
  team2_points: number | null;
  team2_name: string;
  gamebook_url: string | null;
};

export type Player = { id: string; name: string; full_name: string | null; bio: string | null; photo_path: string | null; active: boolean };

export type Match = {
  id: string;
  sort: number;
  arcon_front: string | null;
  arcon_back: string | null;
  arcon_total: string | null;
  team2_front: string | null;
  team2_back: string | null;
  team2_total: string | null;
  arcon_pts: number;
  team2_pts: number;
  match_players: { team: Team; players: { id: string; name: string } }[];
};

export type Session = { id: string; label: string; format: string; sort: number; matches: Match[] };

export type Photo = { id: string; year: number; uploaded_by: string; sort: number | null; storage_path: string; caption: string | null; taken_at: string | null; width: number | null; height: number | null };

export const teamName = (team: Team, t: Pick<Tournament, "team2_name">) => (team === "arcon" ? "Arcon" : t.team2_name);

export const photoUrl = (path: string, thumb = false) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${thumb ? path.replace(/\.jpg$/, "_t.jpg") : path}`;

export function formatDates(t: Pick<Tournament, "start_date" | "end_date">) {
  if (!t.start_date) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", timeZone: "UTC" };
  const start = new Date(t.start_date).toLocaleDateString("en-US", opts);
  if (!t.end_date || t.end_date === t.start_date) return start;
  const end = new Date(t.end_date);
  const sameMonth = new Date(t.start_date).getUTCMonth() === end.getUTCMonth();
  return `${start}–${end.toLocaleDateString("en-US", sameMonth ? { day: "numeric", timeZone: "UTC" } : opts)}`;
}

export function pts(n: number | null) {
  if (n == null) return "–";
  const whole = Math.floor(Number(n));
  if (Number(n) === whole) return String(whole);
  return `${whole || ""}½`;
}
