import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { PhotoGallery } from "@/components/PhotoGallery";
import { getViewer } from "@/lib/supabase/server";
import type { Photo } from "@/lib/data";

export const metadata = { title: "Photos" };

export default async function Photos({ searchParams }: PageProps<"/photos">) {
  const { year } = await searchParams;
  const { supabase, profile } = await getViewer();
  let q = supabase.from("photos").select("*, photo_tags(players(id, name))").order("year", { ascending: false }).order("taken_at");
  if (year) q = q.eq("year", Number(year));
  const [{ data: photos }, { data: years }] = await Promise.all([
    q.returns<(Photo & { photo_tags: { players: { id: string; name: string } }[] })[]>(),
    supabase.from("photos").select("year"),
  ]);
  const yearList = [...new Set(years?.map((y) => y.year))].sort((a, b) => b - a);
  const canPost = profile?.role === "member" || profile?.role === "admin";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1">
          <SectionTitle>Photos</SectionTitle>
        </div>
        {canPost && (
          <Link href="/upload" className="bg-ink text-paper px-4 py-2 rounded text-sm mb-3">
            Upload
          </Link>
        )}
      </div>
      {yearList.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/photos" className={`px-3 py-1 rounded ring-1 ring-line ${!year ? "bg-ink text-paper" : ""}`}>All</Link>
          {yearList.map((y) => (
            <Link key={y} href={`/photos?year=${y}`} className={`px-3 py-1 rounded ring-1 ring-line num ${String(y) === year ? "bg-ink text-paper" : ""}`}>
              {y}
            </Link>
          ))}
        </div>
      )}
      {photos?.length ? (
        <PhotoGallery photos={photos} viewerId={profile?.id ?? null} isAdmin={profile?.role === "admin"} showYear={!year} />
      ) : (
        <p className="mt-6 text-muted">No photos yet. {canPost ? "Dig through your camera roll and upload some." : "Sign in to upload some."}</p>
      )}
    </div>
  );
}
