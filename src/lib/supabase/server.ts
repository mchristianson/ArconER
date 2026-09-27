import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  player_id: string | null;
  role: "pending" | "member" | "admin";
};

export async function getViewer() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { supabase, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
  return { supabase, profile };
}
