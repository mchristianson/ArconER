"use client";

import { useEffect, useState } from "react";

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => (clearTimeout(first), clearInterval(id));
  }, []);

  const ms = Math.max(0, new Date(to).getTime() - (now ?? 0));
  const parts = [
    ["Days", Math.floor(ms / 864e5)],
    ["Hours", Math.floor(ms / 36e5) % 24],
    ["Min", Math.floor(ms / 6e4) % 60],
    ["Sec", Math.floor(ms / 1e3) % 60],
  ] as const;

  return (
    <div className="flex gap-2 sm:gap-3" aria-live="off">
      {parts.map(([label, v]) => (
        <div key={label} className="bg-paper/10 ring-1 ring-paper/20 rounded px-3 py-2 sm:px-4 sm:py-3 text-center min-w-16">
          <div className="font-display num text-3xl sm:text-5xl leading-none">{now == null ? "–" : v}</div>
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] mt-1 text-paper/70">{label}</div>
        </div>
      ))}
    </div>
  );
}
