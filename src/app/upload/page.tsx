import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { Uploader } from "@/components/Uploader";
import { getViewer } from "@/lib/supabase/server";

export const metadata = { title: "Upload Photos" };

export default async function Upload({ searchParams }: PageProps<"/upload">) {
  const { year } = await searchParams;
  const { supabase, profile } = await getViewer();
  const canPost = profile?.role === "member" || profile?.role === "admin";
  const [{ data: years }, { data: players }] = await Promise.all([
    supabase.from("tournaments").select("year").order("year", { ascending: false }),
    supabase.from("players").select("id, name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <SectionTitle>Upload Photos</SectionTitle>
      {canPost ? (
        <Uploader
          years={(years ?? []).map((y) => y.year)}
          players={players ?? []}
          defaultYear={year ? Number(year) : null}
          userId={profile!.id}
        />
      ) : (
        <p className="mt-6 text-muted">
          {profile ? "Your account is waiting for an admin to approve it." : "Sign in with Google to upload photos."}{" "}
          <Link href="/photos" className="underline">Browse photos</Link>
        </p>
      )}
    </div>
  );
}
