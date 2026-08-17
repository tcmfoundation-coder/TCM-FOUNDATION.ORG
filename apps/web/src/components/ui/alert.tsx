import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type AlertVariant = "success" | "warning" | "error" | "info";

const config: Record<AlertVariant, { icon: typeof Info; classes: string }> = {
  success: { icon: CheckCircle2, classes: "border-success/30 bg-success/5 text-success" },
  warning: { icon: AlertTriangle, classes: "border-warning/30 bg-warning/5 text-warning" },
  error: { icon: XCircle, classes: "border-error/30 bg-error/5 text-error" },
  info: { icon: Info, classes: "border-brand-700/30 bg-brand-50 text-brand-700" },
};

export function Alert({ variant, children }: { variant: AlertVariant; children: ReactNode }) {
  const { icon: Icon, classes } = config[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-sm border px-4 py-3 text-sm ${classes}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="text-stone-800">{children}</div>
    </div>
  );
}
