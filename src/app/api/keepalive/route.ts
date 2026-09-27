import { createClient } from "@supabase/supabase-js";

// Daily Vercel cron: one tiny query so the free Supabase project never hits its 7-day idle pause.
export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const { error } = await supabase.from("tournaments").select("year").limit(1);
  return Response.json({ ok: !error }, { status: error ? 500 : 200 });
}
