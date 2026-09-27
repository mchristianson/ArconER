import { addComment, deleteComment } from "@/app/actions";
import { createClient, type Profile } from "@/lib/supabase/server";

type Row = { id: string; body: string; created_at: string; author: string; profiles: { display_name: string | null; avatar_url: string | null } };

export async function Comments({ year, profile }: { year: number; profile: Profile | null }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at, author, profiles(display_name, avatar_url)")
    .eq("year", year)
    .is("photo_id", null)
    .order("created_at")
    .returns<Row[]>();
  const canPost = profile?.role === "member" || profile?.role === "admin";

  return (
    <div className="mt-4 space-y-4">
      {!data?.length && <p className="text-muted">No memories yet. What happened this year?</p>}
      {data?.map((c) => (
        <div key={c.id} className="flex gap-3">
          {c.profiles.avatar_url ? (
            <img src={c.profiles.avatar_url} alt="" className="h-9 w-9 rounded-full shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-line shrink-0" />
          )}
          <div className="flex-1 bg-card ring-1 ring-line rounded px-4 py-3">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-semibold">{c.profiles.display_name}</span>
              <span className="text-muted text-xs">{new Date(c.created_at).toLocaleDateString()}</span>
              {(c.author === profile?.id || profile?.role === "admin") && (
                <form action={deleteComment} className="ml-auto">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="year" value={year} />
                  <button className="text-xs text-muted hover:text-arcon">Delete</button>
                </form>
              )}
            </div>
            <p className="mt-1 whitespace-pre-line">{c.body}</p>
          </div>
        </div>
      ))}
      {canPost ? (
        <form action={addComment} className="space-y-2">
          <input type="hidden" name="year" value={year} />
          <textarea
            name="body"
            required
            maxLength={5000}
            rows={3}
            placeholder="Who won? Best shot? Worst story? Where did you stay?"
            className="w-full bg-card ring-1 ring-line rounded px-3 py-2 focus:outline-none focus:ring-gold"
          />
          <button className="bg-ink text-paper px-4 py-2 rounded text-sm">Post memory</button>
        </form>
      ) : (
        <p className="text-sm text-muted">{profile ? "Once an admin approves your account you can post." : "Sign in with Google to share a memory."}</p>
      )}
    </div>
  );
}
