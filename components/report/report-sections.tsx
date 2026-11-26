import { Fragment } from "react";
import { issueCountByRequirement } from "@/agents/ReportAgent";
import { reportStrings } from "@/lib/i18n";
import { formatDuration } from "@/lib/utils";
import type { Report } from "@/types";
import { SeverityBadge } from "./severity";

/** Highlights "[ASSUMPTION: …]" placeholders the recommendation agent inserts for values only the business can decide. */
function WithAssumptions({ text }: { text: string }) {
  const parts = text.split(/(\[(?:ASSUMPTION|ДОПУЩЕНИЕ|ПРЕДПОЛОЖЕНИЕ):[^\]]*\])/i);
  return (
    <>
      {parts.map((part, i) =>
        /^\[(?:ASSUMPTION|ДОПУЩЕНИЕ|ПРЕДПОЛОЖЕНИЕ):/i.test(part) ? (
          <mark key={i} className="rounded bg-warning/15 px-1 font-sans text-[0.85em] text-fg">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function RequirementsTable({ report }: { report: Report }) {
  const t = reportStrings(report.language);
  const L = t.labels;
  const counts = issueCountByRequirement(report);
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-white/[0.03] text-xs text-fg-muted">
          <tr>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.id}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.requirement}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.type}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.priority}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.dependsOn}</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">{L.issues}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {report.requirements.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-fg">
                {r.id}
                {r.sourceRef ? <span className="block text-xs text-fg-subtle">{r.sourceRef}</span> : null}
              </td>
              <td className="doc-text px-3 py-2.5 text-[0.93rem] leading-snug">{r.text}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">{t.requirementTypes[r.type]}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">{t.priorities[r.priority]}</td>
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-fg-muted">{r.dependsOn.join(", ") || "–"}</td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-fg">{counts.get(r.id) ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MissingList({ report }: { report: Report }) {
  const t = reportStrings(report.language);
  if (!report.missingRequirements.length) return <p className="text-sm text-fg-muted">{t.labels.noIssues}</p>;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {report.missingRequirements.map((m, i) => (
        <article key={`${m.title}-${i}`} className="keep-together rounded-xl border border-line bg-ink/30 p-4">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={m.severity} label={t.severity[m.severity]} />
            <span className="text-xs text-fg-subtle">M-{i + 1}</span>
          </div>
          <h3 className="mt-2.5 font-medium text-fg">{m.title}</h3>
          {m.description ? <p className="mt-1 text-sm text-fg-muted">{m.description}</p> : null}
          {m.suggestedRequirement ? (
            <div className="mt-3 border-l-2 border-accent/70 pl-3">
              <p className="text-xs text-fg-subtle">{t.labels.suggested}</p>
              <p className="doc-text mt-0.5 text-[0.95rem]">
                <WithAssumptions text={m.suggestedRequirement} />
              </p>
            </div>
          ) : null}
          {m.standardRef ? <p className="mt-2.5 text-xs text-fg-subtle">{m.standardRef}</p> : null}
        </article>
      ))}
    </div>
  );
}

export function EdgeCaseTable({ report }: { report: Report }) {
  const t = reportStrings(report.language);
  const L = t.labels;
  if (!report.edgeCases.length) return <p className="text-sm text-fg-muted">{L.noIssues}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-white/[0.03] text-xs text-fg-muted">
          <tr>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.severity}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.scenario}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.expected}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.affects}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {report.edgeCases.map((e, i) => (
            <tr key={i} className="align-top">
              <td className="whitespace-nowrap px-3 py-2.5">
                <SeverityBadge severity={e.severity} label={t.severity[e.severity]} />
              </td>
              <td className="px-3 py-2.5 text-fg">{e.scenario}</td>
              <td className="px-3 py-2.5 text-fg-muted">{e.expectedBehavior}</td>
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-fg-muted">{e.requirementIds.join(", ") || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImprovementList({ report }: { report: Report }) {
  const t = reportStrings(report.language);
  const L = t.labels;
  if (!report.improvements.length) return <p className="text-sm text-fg-muted">{L.noIssues}</p>;
  return (
    <div className="grid grid-cols-1 gap-4">
      {report.improvements.map((imp) => (
        <article key={imp.requirementId} className="keep-together rounded-xl border border-line bg-ink/30 p-4 sm:p-5">
          <h3 className="font-semibold tabular-nums text-fg">{imp.requirementId}</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-fg-subtle">{L.original}</p>
              <p className="doc-text mt-1 text-[0.95rem] text-fg-muted">{imp.original}</p>
            </div>
            <div className="border-l-2 border-success/70 pl-3">
              <p className="text-xs text-fg-subtle">{L.improved}</p>
              <p className="doc-text mt-1 text-[0.95rem]">
                <WithAssumptions text={imp.improved} />
              </p>
            </div>
          </div>
          {imp.explanation ? (
            <p className="mt-3 text-sm text-fg-muted">
              <span className="text-fg-subtle">{L.why}: </span>
              {imp.explanation}
            </p>
          ) : null}
          {imp.acceptanceCriteria.length ? (
            <div className="mt-3">
              <p className="text-xs text-fg-subtle">{L.acceptanceCriteria}</p>
              <ul className="mt-1 grid grid-cols-1 gap-1 text-sm text-fg">
                {imp.acceptanceCriteria.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-fg-subtle" />
                    <span>
                      <WithAssumptions text={c} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function AuditTrail({ report }: { report: Report }) {
  const t = reportStrings(report.language);
  const L = t.labels;
  const STATUS_CLASS = { done: "text-success", skipped: "text-fg-subtle", error: "text-danger" } as const;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-white/[0.03] text-xs text-fg-muted">
          <tr>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.agent}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.status}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.models}</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">{L.duration}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{L.detail}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {report.audit.map((a, i) => (
            <tr key={`${a.agent}-${i}`} className="align-top">
              <td className="whitespace-nowrap px-3 py-2.5 text-fg">{t.agents[a.agent]}</td>
              <td className={`whitespace-nowrap px-3 py-2.5 ${STATUS_CLASS[a.status]}`}>{t.stepStatus[a.status]}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">{a.model === "rules" || a.model === "deterministic" ? "–" : (a.model ?? "–")}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-fg-muted">{formatDuration(a.durationMs, report.language)}</td>
              <td className="px-3 py-2.5 text-fg-muted">{t.describe(a.agent, a.status, a.metrics ?? {}) ?? a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
