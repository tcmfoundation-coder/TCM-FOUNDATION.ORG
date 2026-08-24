// A single split bar for a genuine two-way comparison (e.g. active vs
// deactivated users) — used only where comparing two real counts actually
// aids understanding, not as decoration. The percentages/labels are real
// text next to the bar, not encoded only in its width.
export function ComparisonBar({
  segments,
}: {
  segments: { label: string; value: number; className: string }[];
}) {
  const total = Math.max(
    1,
    segments.reduce((sum, s) => sum + s.value, 0),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-100" role="presentation">
        {segments.map((s) => (
          <div
            key={s.label}
            className={s.className}
            style={{ width: `${(s.value / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-xs text-stone-600">
            <span aria-hidden="true" className={`size-2 rounded-full ${s.className}`} />
            <span className="font-medium text-stone-800">{s.value.toLocaleString()}</span>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
