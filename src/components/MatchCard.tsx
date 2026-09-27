import type { Match } from "@/lib/data";
import { pts } from "@/lib/data";
import Link from "next/link";

// One match as a Ryder Cup scoreboard row: Arcon names left, result center, 838 names right.
export function MatchCard({ m }: { m: Match }) {
  const names = (team: string) =>
    m.match_players
      .filter((mp) => mp.team === team)
      .map((mp) => (
        <Link key={mp.players.id} href={`/players/${mp.players.id}`} className="hover:underline">
          {mp.players.name}
        </Link>
      ));
  const diff = m.arcon_pts - m.team2_pts;
  const winner = diff > 0 ? "arcon" : diff < 0 ? "838" : null;
  const result = winner === "arcon" ? m.arcon_total : winner === "838" ? m.team2_total : null;
  const segs = [
    ["F", m.arcon_front, m.team2_front],
    ["B", m.arcon_back, m.team2_back],
    ["T", m.arcon_total, m.team2_total],
  ] as const;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch bg-card ring-1 ring-line rounded overflow-hidden text-sm">
      <div className={`flex flex-col justify-center gap-0.5 px-3 py-2 ${winner === "arcon" ? "bg-arcon text-white" : "bg-arcon-soft"}`}>
        {names("arcon")}
      </div>
      <div className="flex flex-col items-center justify-center px-3 py-2 min-w-24 text-center">
        <div className={`font-display num text-base ${winner === "arcon" ? "text-arcon" : winner === "838" ? "text-blue" : "text-muted"}`}>
          {winner ? result || "Won" : "Halved"}
        </div>
        <div className="num text-[11px] text-muted">
          {pts(m.arcon_pts)} – {pts(m.team2_pts)}
        </div>
        <div className="flex gap-1.5 mt-1 text-[10px] text-muted" title="Front / Back / Total">
          {segs.map(([k, a, b]) => (
            <span key={k} className={a && a !== "AS" ? "text-arcon" : b && b !== "AS" ? "text-blue" : ""}>
              {k}
            </span>
          ))}
        </div>
      </div>
      <div className={`flex flex-col justify-center items-end gap-0.5 px-3 py-2 text-right ${winner === "838" ? "bg-blue text-white" : "bg-blue-soft"}`}>
        {names("838")}
      </div>
    </div>
  );
}
