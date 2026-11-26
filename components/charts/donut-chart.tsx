"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  icon: LucideIcon;
}

const SIZE = 168;
const R = 64;
const STROKE = 20;
const C = 2 * Math.PI * R;
const GAP = 2;

/** Part-to-whole donut with a legend that carries label, icon and count, so colour is never the only cue. */
export function DonutChart({ segments, centerLabel, title }: { segments: DonutSegment[]; centerLabel: string; title: string }) {
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const shown = segments.filter((s) => s.value > 0);
  const activeSegment = segments.find((s) => s.key === active);

  let offset = 0;
  const arcs = shown.map((s) => {
    const length = (s.value / total) * C;
    const arc = { ...s, dash: Math.max(0.5, length - (shown.length > 1 ? GAP : 0)), offset };
    offset += length;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-[168px] shrink-0" role="img" aria-label={title}>
        <title>{title}</title>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--color-line)" strokeWidth={STROKE} />
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={active === a.key ? STROKE + 4 : STROKE}
              strokeDasharray={`${a.dash} ${C - a.dash}`}
              strokeDashoffset={-a.offset}
              opacity={active && active !== a.key ? 0.4 : 1}
              onMouseEnter={() => setActive(a.key)}
              onMouseLeave={() => setActive(null)}
              className="transition-opacity"
            />
          ))}
        </g>
        <text x={SIZE / 2} y={SIZE / 2 - 2} textAnchor="middle" fontSize={30} fontWeight={600} fill="var(--color-fg)">
          {activeSegment ? activeSegment.value : total}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 18} textAnchor="middle" fontSize={11.5} fill="var(--color-fg-muted)">
          {activeSegment ? activeSegment.label : centerLabel}
        </text>
      </svg>

      <ul className="grid grid-cols-1 w-full gap-1">
        {segments.map((s) => {
          const Icon = s.icon;
          return (
            <li
              key={s.key}
              tabIndex={0}
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.key)}
              onBlur={() => setActive(null)}
              className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm outline-none", active === s.key && "bg-white/[0.05]")}
            >
              <Icon aria-hidden className="size-4 shrink-0" style={{ color: s.color }} />
              <span className="flex-1 text-fg-muted">{s.label}</span>
              <span className="font-semibold tabular-nums text-fg">{s.value}</span>
              <span className="w-10 text-right text-xs tabular-nums text-fg-subtle">{total ? Math.round((s.value / total) * 100) : 0}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
