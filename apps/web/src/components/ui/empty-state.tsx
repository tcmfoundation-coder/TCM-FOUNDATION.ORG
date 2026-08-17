import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-stone-300 px-6 py-16 text-center">
      <Icon aria-hidden="true" className="size-8 text-stone-400" />
      <p className="font-medium text-stone-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-stone-500">{description}</p>}
      {action}
    </div>
  );
}
