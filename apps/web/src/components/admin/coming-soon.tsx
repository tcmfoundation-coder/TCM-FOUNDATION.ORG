import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

interface ComingSoonProps {
  icon?: LucideIcon;
  title: string;
  description: string;
}

// For admin sections with no backend support yet (see the project's backend
// audit reports) — an honest "not built yet" state instead of a form or
// list that silently fails every mutation against a nonexistent API.
export function ComingSoon({ icon: Icon = Construction, title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-stone-300 px-6 py-20 text-center">
      <Icon aria-hidden="true" className="size-8 text-stone-400" />
      <p className="font-display text-lg font-medium text-stone-800">{title}</p>
      <p className="max-w-md text-sm text-stone-500">{description}</p>
    </div>
  );
}
