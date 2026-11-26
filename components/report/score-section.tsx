"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Meter } from "@/components/charts/meter";
import { RadarChart } from "@/components/charts/radar-chart";
import { reportStrings } from "@/lib/i18n";
import { DIMENSIONS, explainDimensions } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { Report } from "@/types";

export function ScoreSection({ report }: { report: Report }) {
  const [open, setOpen] = useState(false);
  const t = reportStrings(report.language);
  const L = t.labels;
  const axes = DIMENSIONS.map((d) => ({ key: d, label: t.dimensions[d], value: report.scores.dimensions[d] }));
  const contributors = explainDimensions({
    findings: report.findings,
    missingRequirements: report.missingRequirements,
    edgeCases: report.edgeCases,
    requirementCount: report.requirements.length,
  });

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <RadarChart axes={axes} title={`${t.sections.score}: ${report.scores.overall}/100`} />
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-end gap-3 border-b border-line pb-4">
            <span className="text-4xl font-semibold leading-none text-fg">{report.scores.overall}</span>
            <span className="pb-1 text-sm text-fg-muted">
              {L.outOf100}, {t.verdict[report.scores.verdict].toLowerCase()}
            </span>
          </div>
          {axes.map((a) => (
            <Meter key={a.key} label={a.label} value={a.value} />
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="no-print inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:underline"
        >
          {L.howCalculated}
          <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        <div className={cn("mt-3 gap-4 print:grid", open ? "grid" : "hidden")}>
          <p className="max-w-3xl text-sm leading-relaxed text-fg-muted">{L.scoreFormula}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DIMENSIONS.map((d) => (
              <div key={d} className="rounded-xl border border-line p-3">
                <p className="text-sm font-medium text-fg">
                  {t.dimensions[d]} <span className="tabular-nums text-fg-muted">{report.scores.dimensions[d]}</span>
                </p>
                <p className="mt-1 text-xs text-fg-subtle">{L.topContributors}</p>
                {contributors[d].length ? (
                  <ul className="mt-1.5 grid grid-cols-1 gap-1 text-xs text-fg-muted">
                    {contributors[d].map((c) => (
                      <li key={`${c.ref}-${c.dimension}`} className="flex gap-2">
                        <span className="w-10 shrink-0 tabular-nums text-fg">−{c.points.toFixed(1)}</span>
                        <span className="min-w-0 truncate" title={c.title}>
                          {c.ref} {c.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-xs text-fg-muted">{L.noContributors}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
