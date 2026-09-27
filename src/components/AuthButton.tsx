"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/server";

export function AuthButton({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  if (!profile) {
    return (
      <button
        onClick={() =>
          supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(pathname)}` },
          })
        }
        className="text-sm border border-paper/40 rounded px-3 py-1.5 hover:bg-paper hover:text-ink"
      >
        Sign in with Google
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      {profile.avatar_url && <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />}
      <span className="hidden sm:inline">{profile.display_name}</span>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.refresh();
        }}
        className="text-paper/70 hover:text-paper"
      >
        Sign out
      </button>
    </div>
  );
}
