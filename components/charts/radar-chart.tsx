"use client";

import { useState } from "react";

export interface RadarAxis {
  key: string;
  label: string;
  value: number;
}

const W = 380;
const H = 320;
const CX = W / 2;
const CY = H / 2 + 4;
const R = 112;
const RINGS = [25, 50, 75, 100];

function point(index: number, count: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  const r = (Math.max(0, Math.min(100, value)) / 100) * R;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

/** Single-series radar for the six quality dimensions (0-100). Values are listed beside it, so the chart labels axes only. */
export function RadarChart({ axes, title }: { axes: RadarAxis[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const n = axes.length;
  const polygon = axes.map((a, i) => point(i, n, a.value).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
      <title>{title}</title>
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => point(i, n, ring).join(",")).join(" ")}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={1}
        />
      ))}
      {axes.map((a, i) => {
        const [x, y] = point(i, n, 100);
        return <line key={a.key} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--color-line)" strokeWidth={1} />;
      })}

      <polygon points={polygon} fill="var(--color-primary)" fillOpacity={0.14} stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" />

      {axes.map((a, i) => {
        const [x, y] = point(i, n, a.value);
        const [lx, ly] = point(i, n, 100 + 22);
        const anchor = Math.abs(lx - CX) < 8 ? "middle" : lx > CX ? "start" : "end";
        return (
          <g key={a.key}>
            <text x={lx} y={ly} dy="0.35em" textAnchor={anchor} fontSize={12.5} fill={active === i ? "var(--color-fg)" : "var(--color-fg-muted)"}>
              {a.label}
            </text>
            <circle cx={x} cy={y} r={active === i ? 5.5 : 4} fill="var(--color-primary)" stroke="var(--color-ink-2)" strokeWidth={2} />
            <circle
              cx={x}
              cy={y}
              r={16}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${a.label}: ${a.value} out of 100`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none"
            />
          </g>
        );
      })}

      {active !== null
        ? (() => {
            const a = axes[active];
            const [x, y] = point(active, n, a.value);
            const text = `${a.label} ${a.value}`;
            const width = text.length * 7 + 20;
            const tx = Math.min(W - width - 4, Math.max(4, x - width / 2));
            const ty = y - 40 < 4 ? y + 14 : y - 40;
            return (
              <g pointerEvents="none">
                <rect x={tx} y={ty} width={width} height={26} rx={6} fill="var(--color-ink-3)" stroke="var(--color-line-strong)" />
                <text x={tx + width / 2} y={ty + 17} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--color-fg)">
                  {text}
                </text>
              </g>
            );
          })()
        : null}
    </svg>
  );
}
