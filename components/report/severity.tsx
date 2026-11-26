import { CircleAlert, CircleDot, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/types";

/** Severity colours always ship with an icon and a text label, never colour alone. */
export const SEVERITY_META: Record<Severity, { label: string; color: string; icon: LucideIcon }> = {
  critical: { label: "Critical", color: "var(--color-sev-critical)", icon: TriangleAlert },
  high: { label: "High", color: "var(--color-sev-high)", icon: CircleAlert },
  medium: { label: "Medium", color: "var(--color-sev-medium)", icon: Info },
  low: { label: "Low", color: "var(--color-sev-low)", icon: CircleDot },
};

export function SeverityBadge({ severity, label, className }: { severity: Severity; label?: string; className?: string }) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border border-line bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-fg", className)}>
      <Icon aria-hidden className="size-3.5" style={{ color: meta.color }} />
      {label ?? meta.label}
    </span>
  );
}
