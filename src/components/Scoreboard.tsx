import { pts, type Tournament } from "@/lib/data";

// Big two-panel team total, Ryder Cup leaderboard style.
export function Scoreboard({ t, size = "lg" }: { t: Tournament; size?: "lg" | "sm" }) {
  const big = size === "lg";
  const side = (label: string, score: number | null, won: boolean, color: string) => (
    <div className={`${color} text-white flex-1 flex flex-col items-center justify-center ${big ? "py-6 sm:py-8" : "py-3"}`}>
      <div className={`uppercase tracking-[0.2em] ${big ? "text-xs sm:text-sm" : "text-[10px]"}`}>{label}</div>
      <div className={`font-display num leading-none ${big ? "text-6xl sm:text-8xl mt-2" : "text-3xl mt-1"}`}>{pts(score)}</div>
      <div className={`${big ? "text-xs mt-2" : "text-[10px] mt-1"} uppercase tracking-[0.2em] text-white/85 h-4`}>{won ? "★ Cup winner" : ""}</div>
    </div>
  );
  return (
    <div className="flex rounded-md overflow-hidden shadow-sm ring-1 ring-black/5">
      {side("Arcon", t.arcon_points, t.winner === "arcon", "bg-arcon")}
      {side(t.team2_name, t.team2_points, t.winner === "838", "bg-blue")}
    </div>
  );
}
