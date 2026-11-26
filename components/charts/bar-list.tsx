export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

/** Horizontal bars in one hue (magnitude only), value at the tip, sorted largest first. */
export function BarList({ data, title }: { data: BarDatum[]; title: string }) {
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => (a.key === "other" ? 1 : b.key === "other" ? -1 : b.value - a.value));
  const max = Math.max(1, ...sorted.map((d) => d.value));

  return (
    <ul aria-label={title} className="grid grid-cols-1 gap-2.5">
      {sorted.map((d) => (
        <li key={d.key} className="group grid grid-cols-[minmax(0,12rem)_1fr] items-center gap-3 text-sm" title={`${d.label}: ${d.value}`}>
          <span className="truncate text-fg-muted group-hover:text-fg">{d.label}</span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 rounded-r-[4px] bg-primary transition-opacity group-hover:opacity-80"
              style={{ width: `${Math.max(3, (d.value / max) * 85)}%` }}
            />
            <span className="font-semibold tabular-nums text-fg">{d.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
