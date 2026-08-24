import type { DailyCount } from "@/lib/api/dashboard";

const WIDTH = 280;
const HEIGHT = 64;
const PADDING_Y = 6;

// A small dependency-free line chart for a 30-day daily count. The chart
// itself is presentational only (no interactivity, no animation — nothing
// here needs `"use client"`); the numbers that actually matter (period
// total, most recent day) are rendered as real text alongside it, and the
// SVG carries its own summary via aria-label, so the trend is never
// communicated by the picture alone. prefers-reduced-motion is moot here —
// there's nothing animated to begin with.
export function TrendChart({ label, data }: { label: string; data: DailyCount[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(1, ...data.map((d) => d.count));
  const latest = data[data.length - 1];

  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * WIDTH : WIDTH / 2;
    const y = HEIGHT - PADDING_Y - (d.count / max) * (HEIGHT - PADDING_Y * 2);
    return { x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;

  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;
  const summary = `${label}: ${total} over the last ${data.length} days (${formatShortDate(first)}–${formatShortDate(last)}), most recent day ${latest?.count ?? 0}.`;

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-stone-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
        <p className="text-xs text-stone-400">last {data.length}d</p>
      </div>
      <p className="font-display text-2xl font-medium text-stone-900">{total.toLocaleString()}</p>
      <svg
        role="img"
        aria-label={summary}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-16 w-full text-brand-600"
      >
        <path d={areaPath} fill="currentColor" opacity="0.08" stroke="none" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{summary}</span>
    </div>
  );
}

function formatShortDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}
