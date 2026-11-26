import { cn, scoreTone } from "@/lib/utils";

const FILL = { good: "bg-success", warn: "bg-warning", bad: "bg-danger" } as const;
const TRACK = { good: "bg-success/15", warn: "bg-warning/15", bad: "bg-danger/15" } as const;

/** 0-100 meter; the fill carries the state and the track is a lighter step of the same hue. */
export function Meter({ label, value }: { label: string; value: number }) {
  const tone = scoreTone(value);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-fg-muted">{label}</span>
        <span className="font-semibold tabular-nums text-fg">{value}</span>
      </div>
      <div
        className={cn("mt-1.5 h-2 overflow-hidden rounded-full", TRACK[tone])}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className={cn("h-full rounded-full", FILL[tone])} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
