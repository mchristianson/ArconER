"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// RLS enforces who may do what; these just forward the request and refresh the page.

export async function addComment(form: FormData) {
  const supabase = await createClient();
  const year = Number(form.get("year"));
  const body = String(form.get("body") ?? "").trim();
  const photo_id = (form.get("photo_id") as string) || null;
  if (!body) return;
  const { error } = await supabase.from("comments").insert({ year, body, photo_id });
  if (error) throw new Error(error.message);
  revalidatePath(`/history/${year}`);
}

export async function deleteComment(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", String(form.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath(`/history/${form.get("year")}`);
}

export async function suggestEdit(form: FormData) {
  const supabase = await createClient();
  const year = Number(form.get("year"));
  const { error } = await supabase.from("edit_suggestions").insert({
    year,
    field: String(form.get("field")),
    proposed_value: String(form.get("proposed_value") ?? "").trim(),
    reason: String(form.get("reason") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/history/${year}`);
}

export async function setRsvp(form: FormData) {
  const supabase = await createClient();
  const year = Number(form.get("year"));
  const { data: player_id } = await supabase.rpc("my_player_id");
  if (!player_id) throw new Error("Your account isn't linked to a player yet.");
  const { error } = await supabase.from("rsvps").upsert({
    year,
    player_id,
    status: String(form.get("status")),
    note: String(form.get("note") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/next");
}

// Admin sets the photo order for a year; index 0 is the year's cover.
export async function reorderPhotos(year: number, ids: string[]) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("Admins only");
  const results = await Promise.all(ids.map((id, sort) => supabase.from("photos").update({ sort }).eq("id", id).eq("year", year)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  revalidatePath(`/history/${year}`);
  revalidatePath("/");
  revalidatePath("/photos");
}

export async function deletePhoto(form: FormData) {
  const supabase = await createClient();
  const id = String(form.get("id"));
  const { data: photo } = await supabase.from("photos").select("storage_path, year").eq("id", id).single();
  if (!photo) return;
  await supabase.storage.from("photos").remove([photo.storage_path, photo.storage_path.replace(/\.jpg$/, "_t.jpg")]);
  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/history/${photo.year}`);
  revalidatePath("/photos");
}
