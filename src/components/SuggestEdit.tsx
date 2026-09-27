import { suggestEdit } from "@/app/actions";

const fields = [
  ["winner", "Winner"],
  ["score", "Final score"],
  ["dates", "Dates"],
  ["lodging", "Where we stayed"],
  ["courses", "Courses played"],
  ["roster", "Who played / teams"],
  ["notes", "Other facts"],
] as const;

export function SuggestEdit({ year, canPost, open }: { year: number; canPost: boolean; open: { id: string; field: string; proposed_value: string }[] }) {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted">Know something the record is missing or got wrong? Suggest it and an admin will make it official.</p>
      {!!open.length && (
        <ul className="text-sm space-y-1">
          {open.map((s) => (
            <li key={s.id} className="bg-gold/10 rounded px-3 py-2">
              <span className="font-semibold capitalize">{s.field}:</span> {s.proposed_value} <span className="text-muted">(pending)</span>
            </li>
          ))}
        </ul>
      )}
      {canPost && (
        <form action={suggestEdit} className="space-y-2">
          <input type="hidden" name="year" value={year} />
          <select name="field" className="w-full bg-card ring-1 ring-line rounded px-3 py-2">
            {fields.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input name="proposed_value" required placeholder="e.g. Arcon won 16–14" className="w-full bg-card ring-1 ring-line rounded px-3 py-2" />
          <input name="reason" placeholder="How do you know? (optional)" className="w-full bg-card ring-1 ring-line rounded px-3 py-2" />
          <button className="ring-1 ring-ink px-4 py-2 rounded text-sm">Suggest</button>
        </form>
      )}
    </div>
  );
}
