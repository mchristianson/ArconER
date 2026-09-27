"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// RLS restricts every write here to admins; these helpers just shape form data.

const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const num = (f: FormData, k: string) => (str(f, k) == null ? null : Number(str(f, k)));

async function run(fn: (s: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await fn(await createClient());
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function updateUser(f: FormData) {
  await run((s) => s.from("profiles").update({ role: str(f, "role"), player_id: str(f, "player_id") }).eq("id", str(f, "id")!));
}

export async function saveTournament(f: FormData) {
  await run((s) =>
    s.from("tournaments").upsert({
      year: num(f, "year"),
      start_date: str(f, "start_date"),
      end_date: str(f, "end_date"),
      lodging: str(f, "lodging"),
      lodging_address: str(f, "lodging_address"),
      courses: str(f, "courses"),
      notes: str(f, "notes"),
      winner: str(f, "winner"),
      arcon_points: num(f, "arcon_points"),
      team2_points: num(f, "team2_points"),
      team2_name: str(f, "team2_name") ?? "838 Coatings",
      gamebook_url: str(f, "gamebook_url"),
    }),
  );
}

export async function addRoster(f: FormData) {
  await run((s) => s.from("roster").upsert({ year: num(f, "year"), player_id: str(f, "player_id"), team: str(f, "team"), is_captain: f.get("is_captain") === "on" }));
}

export async function removeRoster(f: FormData) {
  await run((s) => s.from("roster").delete().eq("year", num(f, "year")!).eq("player_id", str(f, "player_id")!));
}

export async function addSession(f: FormData) {
  await run((s) => s.from("sessions").insert({ year: num(f, "year"), label: str(f, "label"), format: str(f, "format"), sort: num(f, "sort") ?? 0 }));
}

export async function deleteSession(f: FormData) {
  await run((s) => s.from("sessions").delete().eq("id", str(f, "id")!));
}

export async function addMatch(f: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      session_id: str(f, "session_id"),
      sort: num(f, "sort") ?? 0,
      arcon_front: str(f, "arcon_front"),
      arcon_back: str(f, "arcon_back"),
      arcon_total: str(f, "arcon_total"),
      team2_front: str(f, "team2_front"),
      team2_back: str(f, "team2_back"),
      team2_total: str(f, "team2_total"),
      arcon_pts: num(f, "arcon_pts") ?? 0,
      team2_pts: num(f, "team2_pts") ?? 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const players = [
    ...f.getAll("arcon_players").map((p) => ({ match_id: data.id, player_id: String(p), team: "arcon" })),
    ...f.getAll("team2_players").map((p) => ({ match_id: data.id, player_id: String(p), team: "838" })),
  ];
  if (players.length) await run((s) => s.from("match_players").insert(players));
  revalidatePath("/", "layout");
}

export async function deleteMatch(f: FormData) {
  await run((s) => s.from("matches").delete().eq("id", str(f, "id")!));
}

export async function addScheduleItem(f: FormData) {
  // Form sends local Hayward time; store with the Central offset.
  const local = str(f, "starts_at")!;
  const month = Number(local.slice(5, 7));
  const offset = month >= 3 && month <= 11 ? "-05:00" : "-06:00";
  await run((s) =>
    s.from("schedule_items").insert({ year: num(f, "year"), starts_at: `${local}:00${offset}`, title: str(f, "title"), location: str(f, "location"), details: str(f, "details") }),
  );
}

export async function deleteScheduleItem(f: FormData) {
  await run((s) => s.from("schedule_items").delete().eq("id", str(f, "id")!));
}

export async function savePlayer(f: FormData) {
  const id = str(f, "id");
  const row = { name: str(f, "name"), full_name: str(f, "full_name"), bio: str(f, "bio"), active: f.get("active") === "on" };
  await run((s) => (id ? s.from("players").update(row).eq("id", id) : s.from("players").insert(row)));
}

export async function reviewSuggestion(f: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  await run((s) => s.from("edit_suggestions").update({ status: str(f, "status"), reviewed_by: data?.claims?.sub }).eq("id", str(f, "id")!));
}
