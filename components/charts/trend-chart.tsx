"use client";

import { useState } from "react";

export interface TrendPoint {
  id: string;
  label: string;
  value: number;
  current?: boolean;
}

const W = 640;
const H = 190;
const PAD = { top: 16, right: 40, bottom: 28, left: 32 };

/** Quality score over saved analyses, oldest to newest. One series, so no legend; the title names it. */
export function TrendChart({ points, title }: { points: TrendPoint[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / 100) * innerH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
      <title>{title}</title>
      {[0, 50, 100].map((tick) => (
        <g key={tick}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-line)" strokeWidth={1} />
          <text x={PAD.left - 8} y={y(tick)} dy="0.35em" textAnchor="end" fontSize={11} fill="var(--color-fg-subtle)">
            {tick}
          </text>
        </g>
      ))}
      <path d={`${path} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="var(--color-primary)" fillOpacity={0.1} />
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {active !== null ? <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} stroke="var(--color-line-strong)" strokeWidth={1} /> : null}

      {points.map((p, i) =>
        p.current || i === points.length - 1 || active === i ? (
          <circle key={p.id} cx={x(i)} cy={y(p.value)} r={p.current ? 5 : 4} fill={p.current ? "var(--color-accent)" : "var(--color-primary)"} stroke="var(--color-ink-2)" strokeWidth={2} />
        ) : null,
      )}

      <text x={x(points.length - 1) + 10} y={y(last.value)} dy="0.35em" fontSize={12} fontWeight={600} fill="var(--color-fg)">
        {last.value}
      </text>
      <text x={PAD.left} y={H - 6} fontSize={11} fill="var(--color-fg-subtle)">
        {points[0].label}
      </text>
      {points.length > 1 ? (
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={11} fill="var(--color-fg-subtle)">
          {last.label}
        </text>
      ) : null}

      {points.map((p, i) => (
        <rect
          key={`hit-${p.id}`}
          x={x(i) - step / 2}
          y={PAD.top}
          width={step}
          height={innerH}
          fill="transparent"
          onMouseEnter={() => setActive(i)}
          onMouseLeave={() => setActive(null)}
        />
      ))}

      {active !== null
        ? (() => {
            const p = points[active];
            const text = `${p.label}: ${p.value}`;
            const width = text.length * 6.6 + 20;
            const tx = Math.min(W - width - 4, Math.max(4, x(active) - width / 2));
            const ty = Math.max(2, y(p.value) - 38);
            return (
              <g pointerEvents="none">
                <rect x={tx} y={ty} width={width} height={24} rx={6} fill="var(--color-ink-3)" stroke="var(--color-line-strong)" />
                <text x={tx + width / 2} y={ty + 16} textAnchor="middle" fontSize={12} fill="var(--color-fg)">
                  {text}
                </text>
              </g>
            );
          })()
        : null}
    </svg>
  );
}
