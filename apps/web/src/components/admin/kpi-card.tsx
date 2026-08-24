import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-start gap-3 rounded-sm border border-stone-200 bg-white p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="text-2xl font-semibold text-stone-900">{value.toLocaleString()}</p>
        <p className="text-xs text-stone-500">{label}</p>
        {detail && <p className="mt-0.5 text-xs text-stone-400">{detail}</p>}
      </div>
    </div>
  );
}
