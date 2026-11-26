"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { reportStrings } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ReportFinding, ReportLanguage } from "@/types";
import { SeverityBadge } from "./severity";

export function FindingCard({ finding, language }: { finding: ReportFinding; language: ReportLanguage }) {
  const [open, setOpen] = useState(false);
  const { t: ui } = useUi();
  const t = reportStrings(language);
  const L = t.labels;
  const panelId = `explain-${finding.id}`;

  return (
    <article className="keep-together rounded-xl border border-line bg-ink/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={finding.severity} label={t.severity[finding.severity]} />
        <span className="rounded-md border border-line px-2 py-0.5 text-xs text-fg-muted">{t.categories[finding.category]}</span>
        {finding.endpoint ? <code className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-xs text-fg-muted">{finding.endpoint}</code> : null}
        <span className="ml-auto text-xs tabular-nums text-fg-subtle">
          {finding.id}, {L.confidenceShort} {Math.round(finding.confidence * 100)}%
        </span>
      </div>

      <h3 className="mt-3 font-medium leading-snug text-fg">{finding.title}</h3>
      {finding.description ? <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{finding.description}</p> : null}

      <p className="mt-3 text-sm">
        <span className="text-fg-subtle">{L.affects}: </span>
        <span className="tabular-nums text-fg">{finding.requirementIds.join(", ") || L.documentLevel}</span>
      </p>

      {finding.recommendation ? (
        <p className="mt-2 flex gap-2 text-sm leading-relaxed text-fg">
          <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            <span className="text-fg-subtle">{L.recommendation}: </span>
            {finding.recommendation}
          </span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="no-print mt-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:underline"
      >
        {open ? ui.report.hide : ui.report.explain}
        <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>

      <div id={panelId} className={cn("mt-3 grid grid-cols-1 gap-3 border-t border-line pt-3 text-sm print:grid", open ? "grid" : "hidden")}>
        {finding.evidence ? (
          <div>
            <p className="text-xs text-fg-subtle">{L.evidence}</p>
            <blockquote className="doc-text mt-1 border-l-2 border-line-strong pl-3 text-[0.95rem] text-fg-muted">“{finding.evidence}”</blockquote>
          </div>
        ) : null}
        {finding.rationale ? (
          <div>
            <p className="text-xs text-fg-subtle">{L.rationale}</p>
            <p className="mt-1 leading-relaxed text-fg-muted">{finding.rationale}</p>
          </div>
        ) : null}
        {finding.standardRef ? (
          <div>
            <p className="text-xs text-fg-subtle">{L.standard}</p>
            <p className="mt-1 text-fg">{finding.standardRef}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function FindingList({ findings, language }: { findings: ReportFinding[]; language: ReportLanguage }) {
  if (!findings.length) return <p className="text-sm text-fg-muted">{reportStrings(language).labels.noIssues}</p>;
  return (
    <div className="grid grid-cols-1 gap-3">
      {findings.map((f) => (
        <FindingCard key={f.id} finding={f} language={language} />
      ))}
    </div>
  );
}
