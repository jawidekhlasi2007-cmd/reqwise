"use client";

import Link from "next/link";
import { ArrowLeft, CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { DonutChart } from "@/components/charts/donut-chart";
import { TrendChart, type TrendPoint } from "@/components/charts/trend-chart";
import { findingsForSection } from "@/agents/ReportAgent";
import { useUi } from "@/components/language-provider";
import { REPORT_SECTION_ORDER, reportStrings, type ReportSectionId } from "@/lib/i18n";
import { SEVERITY_ORDER } from "@/lib/scoring";
import { cn, formatDate, scoreTone } from "@/lib/utils";
import type { ReportSummary } from "@/lib/storage";
import type { IssueCategory, Report } from "@/types";
import { ExportButtons } from "./export-buttons";
import { FindingList } from "./finding-card";
import { ClarifyingQuestions } from "./clarifying-questions";
import { AuditTrail, EdgeCaseTable, ImprovementList, MissingList, RequirementsTable } from "./report-sections";
import { ScoreSection } from "./score-section";
import { SEVERITY_META } from "./severity";

const TONE = {
  good: { icon: CircleCheck, className: "text-success" },
  warn: { icon: CircleAlert, className: "text-warning" },
  bad: { icon: TriangleAlert, className: "text-danger" },
} as const;

function Section({ id, title, children }: { id: ReportSectionId | "audit"; title: string; children: React.ReactNode }) {
  const number = id === "audit" ? null : REPORT_SECTION_ORDER.indexOf(id) + 1;
  return (
    <section id={`section-${id}`} aria-labelledby={`heading-${id}`} className="panel scroll-mt-20 p-5 sm:p-6">
      <h2 id={`heading-${id}`} className="text-lg font-semibold tracking-tight text-fg">
        {number ? <span className="mr-2 tabular-nums text-fg-subtle">{number}.</span> : null}
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Tile({ label, value, note, hero = false }: { label: string; value: React.ReactNode; note?: React.ReactNode; hero?: boolean }) {
  return (
    <div className={cn("panel p-5", hero && "sm:col-span-2 lg:col-span-1")}>
      <p className="text-sm text-fg-muted">{label}</p>
      <p className={cn("mt-2 font-semibold leading-none text-fg", hero ? "text-[3.25rem]" : "text-3xl tabular-nums")}>{value}</p>
      {note ? <div className="mt-2.5 text-sm text-fg-muted">{note}</div> : null}
    </div>
  );
}

export function ReportView({ report, history }: { report: Report; history: ReportSummary[] }) {
  const { t: ui } = useUi();
  const t = reportStrings(report.language);
  const L = t.labels;
  const tone = TONE[scoreTone(report.scores.overall)];
  const ToneIcon = tone.icon;
  const counts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, report.findings.filter((f) => f.severity === s).length]));
  const apiSkipped = report.audit.some((a) => a.agent === "api" && a.status === "skipped");

  const categoryCounts = new Map<IssueCategory, number>();
  for (const f of report.findings) categoryCounts.set(f.category, (categoryCounts.get(f.category) ?? 0) + 1);
  // Show up to twelve categories; beyond that, fold the smallest into "Other".
  const sortedCategories = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);
  const categoryBars =
    sortedCategories.length > 12
      ? [
          ...sortedCategories.slice(0, 11).map(([key, value]) => ({ key, label: t.categories[key], value })),
          { key: "other", label: L.other, value: sortedCategories.slice(11).reduce((sum, [, v]) => sum + v, 0) },
        ]
      : sortedCategories.map(([key, value]) => ({ key, label: t.categories[key], value }));

  const trend: TrendPoint[] = [...history]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((h) => ({ id: h.id, label: formatDate(h.createdAt, report.language), value: h.overall, current: h.id === report.id }));

  const nav: Array<{ id: ReportSectionId | "audit"; label: string }> = [
    ...REPORT_SECTION_ORDER.map((id) => ({ id, label: t.sections[id] })),
    { id: "audit", label: t.appendixAudit },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-8" lang={report.language}>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-md text-sm text-fg-muted hover:text-fg">
          <ArrowLeft aria-hidden className="size-4" />
          {ui.report.back}
        </Link>
        <ExportButtons report={report} />
      </div>

      <header>
        <p className="text-sm text-fg-muted">{t.reportTitle}</p>
        <h1 className="mt-1 text-[1.9rem] font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[2.3rem]">{report.document.title}</h1>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-fg-subtle">{L.file}</dt>
            <dd className="text-fg-muted">{report.fileName}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-fg-subtle">{L.generated}</dt>
            <dd className="text-fg-muted">{formatDate(report.createdAt, report.language)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-fg-subtle">{L.models}</dt>
            <dd className="text-fg-muted">{report.models.join(", ") || "–"}</dd>
          </div>
        </dl>
      </header>

      {report.warnings.length ? (
        <div role="note" className="mt-6 rounded-xl border border-warning/40 bg-warning/[0.08] px-4 py-3 text-sm text-fg">
          <span className="font-medium">{L.warnings}: </span>
          {report.warnings.join(" ")}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          hero
          label={L.qualityScore}
          value={report.scores.overall}
          note={
            <span className="flex items-center gap-1.5">
              <ToneIcon aria-hidden className={cn("size-4", tone.className)} />
              {t.verdict[report.scores.verdict]}
            </span>
          }
        />
        <Tile label={L.totalRequirements} value={report.requirements.length} note={`${L.endpoints}: ${report.endpoints.length}`} />
        <Tile
          label={L.issuesFound}
          value={report.findings.length}
          note={`${t.severity.critical}: ${counts.critical}, ${t.severity.high}: ${counts.high}`}
        />
        <Tile
          label={L.riskScore}
          value={report.scores.risk}
          note={
            <>
              <span className="block first-letter:uppercase">{L.lowerIsBetter}</span>
              {report.findings.length ? (
                <span className="block">
                  {L.confidence}: {Math.round(report.scores.confidence * 100)}%
                </span>
              ) : null}
            </>
          }
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label={ui.report.sectionsNav} className="no-print hidden xl:block">
          <ol className="sticky top-20 grid grid-cols-1 gap-0.5 text-sm">
            {nav.map((item, index) => (
              <li key={item.id}>
                <a href={`#section-${item.id}`} className="flex gap-2 rounded-md px-2 py-1.5 text-fg-muted hover:bg-white/[0.04] hover:text-fg">
                  <span className="w-5 shrink-0 tabular-nums text-fg-subtle">{item.id === "audit" ? "" : index + 1}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid grid-cols-1 min-w-0 gap-6">
          <Section id="summary" title={t.sections.summary}>
            <p className="max-w-3xl text-[1.05rem] leading-relaxed text-fg">{report.executiveSummary.summary}</p>
            {report.executiveSummary.keyRisks.length || report.executiveSummary.strengths.length ? (
              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                {report.executiveSummary.keyRisks.length ? (
                  <div>
                    <h3 className="text-sm font-medium text-fg">{L.keyRisks}</h3>
                    <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm text-fg-muted">
                      {report.executiveSummary.keyRisks.map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-sev-critical" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {report.executiveSummary.strengths.length ? (
                  <div>
                    <h3 className="text-sm font-medium text-fg">{L.strengths}</h3>
                    <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm text-fg-muted">
                      {report.executiveSummary.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <CircleCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Section>

          <Section id="questions" title={t.sections.questions}>
            <ClarifyingQuestions report={report} />
          </Section>

          <Section id="overview" title={t.sections.overview}>
            {report.document.summary ? <p className="max-w-3xl text-fg-muted">{report.document.summary}</p> : null}
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
              {[
                [L.totalRequirements, report.requirements.length],
                [L.words, report.document.stats.words],
                [L.sections, report.document.stats.sections],
                [L.endpoints, report.endpoints.length],
                [L.domain, report.document.domain || "–"],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-ink-2 px-4 py-3">
                  <dt className="text-xs text-fg-muted">{label}</dt>
                  <dd className={cn("mt-1 font-semibold text-fg", typeof value === "number" ? "text-xl tabular-nums" : "text-sm leading-snug")}>{value}</dd>
                </div>
              ))}
            </dl>
            {report.duplicates.length ? (
              <p className="mt-4 text-sm text-fg-muted">
                <span className="font-medium text-fg">{L.duplicates}: </span>
                {report.duplicates.map((d) => `${d.a} ↔ ${d.b} (${Math.round(d.similarity * 100)}%)`).join("; ")}
              </p>
            ) : null}
            <div className="mt-5">
              <RequirementsTable report={report} />
            </div>
          </Section>

          <Section id="findings" title={t.sections.findings}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-4 text-sm font-medium text-fg">{L.bySeverity}</h3>
                <DonutChart
                  title={L.bySeverity}
                  centerLabel={L.issuesFound.toLowerCase()}
                  segments={SEVERITY_ORDER.map((s) => ({
                    key: s,
                    label: t.severity[s],
                    value: counts[s],
                    color: SEVERITY_META[s].color,
                    icon: SEVERITY_META[s].icon,
                  }))}
                />
              </div>
              <div>
                <h3 className="mb-4 text-sm font-medium text-fg">{L.byCategory}</h3>
                {categoryCounts.size ? (
                  <BarList title={L.byCategory} data={categoryBars} />
                ) : (
                  <p className="text-sm text-fg-muted">{L.noIssues}</p>
                )}
              </div>
            </div>
            {trend.length >= 2 ? (
              <div className="no-print mt-8 border-t border-line pt-6">
                <h3 className="mb-3 text-sm font-medium text-fg">{L.trend}</h3>
                <TrendChart points={trend} title={L.trend} />
              </div>
            ) : null}
          </Section>

          <Section id="validation" title={t.sections.validation}>
            <FindingList findings={findingsForSection(report, "validation")} language={report.language} />
          </Section>

          <Section id="api" title={t.sections.api}>
            {apiSkipped ? (
              <p className="text-sm text-fg-muted">{L.apiSkipped}</p>
            ) : (
              <FindingList findings={findingsForSection(report, "api")} language={report.language} />
            )}
          </Section>

          <Section id="security" title={t.sections.security}>
            <FindingList findings={findingsForSection(report, "security")} language={report.language} />
          </Section>

          <Section id="missing" title={t.sections.missing}>
            <MissingList report={report} />
          </Section>

          <Section id="edgeCases" title={t.sections.edgeCases}>
            <EdgeCaseTable report={report} />
          </Section>

          <Section id="improvements" title={t.sections.improvements}>
            <ImprovementList report={report} />
          </Section>

          <Section id="score" title={t.sections.score}>
            <ScoreSection report={report} />
          </Section>

          <Section id="audit" title={t.appendixAudit}>
            <AuditTrail report={report} />
          </Section>
        </div>
      </div>
    </main>
  );
}
