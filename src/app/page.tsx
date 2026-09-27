import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { Scoreboard } from "@/components/Scoreboard";
import { SectionTitle } from "@/components/SectionTitle";
import { YearCards } from "@/components/YearCards";
import { createClient } from "@/lib/supabase/server";
import { formatDates, photoUrl, type Photo, type Tournament } from "@/lib/data";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: tournaments }, { data: photos }, { data: covers }] = await Promise.all([
    supabase.from("tournaments").select("*").order("year", { ascending: false }).returns<Tournament[]>(),
    supabase.from("photos").select("*").order("created_at", { ascending: false }).limit(8).returns<Photo[]>(),
    supabase.from("photos").select("year, storage_path").order("created_at"),
  ]);
  const all = tournaments ?? [];
  const thisYear = new Date().getFullYear();
  const upcoming = all.filter((t) => t.winner == null && t.year >= thisYear).at(-1);
  const last = all.find((t) => t.winner != null);
  const wins = { arcon: all.filter((t) => t.winner === "arcon").length, t2: all.filter((t) => t.winner === "838").length };
  const unknown = all.filter((t) => t.winner == null && t.year < thisYear).length;

  return (
    <>
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-20 grid gap-10 md:grid-cols-[1.2fr_1fr] items-center">
          <div>
            <p className="uppercase tracking-[0.3em] text-xs text-gold">Hayward, Wisconsin · Since 2001</p>
            <h1 className="font-display text-5xl sm:text-7xl mt-3 leading-[1.05]">
              The ArconEr
              <br />
              Cup
            </h1>
            <p className="mt-5 text-paper/80 max-w-md">
              <span className="text-[#ff6b7d]">Arcon</span> vs <span className="text-[#7fb2e5]">ER Systems / 838 Coatings</span>. Sixteen
              guys, two teams, one weekend every September.
            </p>
          </div>
          <div>
            {upcoming ? (
              <>
                <p className="uppercase tracking-[0.2em] text-xs text-paper/70 mb-3">
                  {upcoming.year} Cup {formatDates(upcoming) ? `· ${formatDates(upcoming)}` : ""}
                </p>
                {upcoming.start_date ? (
                  <Countdown to={`${upcoming.start_date}T12:00:00-05:00`} />
                ) : (
                  <p className="font-display text-2xl">Dates coming soon.</p>
                )}
                {upcoming.lodging && <p className="mt-4 text-paper/80">{upcoming.lodging}</p>}
                <Link href="/next" className="inline-block mt-6 bg-gold text-ink font-semibold px-5 py-2.5 rounded hover:bg-paper">
                  Details & RSVP →
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {last && (
          <section className="mt-12">
            <SectionTitle>{last.year} Result</SectionTitle>
            <Link href={`/history/${last.year}`} className="block mt-4">
              <Scoreboard t={last} />
            </Link>
          </section>
        )}

        <section className="mt-12 grid gap-6 sm:grid-cols-3">
          <Stat label="Arcon Cups" value={wins.arcon} color="text-arcon" />
          <Stat label="838 / ER Cups" value={wins.t2} color="text-blue" />
          <a href="#history" className="bg-card ring-1 ring-line rounded p-6 hover:ring-gold">
            <div className="font-display num text-5xl text-gold">{unknown}</div>
            <div className="uppercase tracking-[0.2em] text-xs mt-2 text-muted">Years we don&apos;t have results for</div>
            <div className="text-sm mt-3">Remember who won? Help fill in the history →</div>
          </a>
        </section>

        <section className="mt-12">
          <SectionTitle id="history">Every Cup Since 2001</SectionTitle>
          <p className="mt-3 text-muted max-w-2xl">
            Patrick&apos;s records start in 2014. For earlier years, share what you remember and upload old photos so we can fill in
            the gaps.
          </p>
          <YearCards tournaments={all} covers={covers ?? []} />
        </section>

        {!!photos?.length && (
          <section className="mt-12">
            <SectionTitle>Recent Photos</SectionTitle>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {photos.map((p) => (
                <Link key={p.id} href={`/history/${p.year}#photos`} className="aspect-square overflow-hidden rounded bg-line">
                  <img src={photoUrl(p.storage_path, true)} alt={p.caption ?? `${p.year}`} className="h-full w-full object-cover" loading="lazy" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card ring-1 ring-line rounded p-6">
      <div className={`font-display num text-5xl ${color}`}>{value}</div>
      <div className="uppercase tracking-[0.2em] text-xs mt-2 text-muted">{label}</div>
    </div>
  );
}
