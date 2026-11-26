import { findingsForSection } from "@/agents/ReportAgent";
import { REPORT_SECTION_ORDER, reportStrings } from "@/lib/i18n";
import { DIMENSIONS } from "@/lib/scoring";
import { formatDate, formatDuration } from "@/lib/utils";
import type { Report, ReportFinding } from "@/types";

/** Renders a report as Markdown in the report's language, following the fixed section template. */
export function reportToMarkdown(report: Report, answers: Record<string, string> = {}): string {
  const t = reportStrings(report.language);
  const L = t.labels;
  const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/\n+/g, " ");
  const number = (id: (typeof REPORT_SECTION_ORDER)[number]) => REPORT_SECTION_ORDER.indexOf(id) + 1;
  const heading = (id: (typeof REPORT_SECTION_ORDER)[number]) => `## ${number(id)}. ${t.sections[id]}`;
  const out: string[] = [];

  out.push(`# ${t.reportTitle}: ${report.document.title}`);
  out.push("");
  out.push(`- **${L.file}:** ${report.fileName}`);
  out.push(`- **${L.generated}:** ${formatDate(report.createdAt, report.language)}`);
  out.push(`- **${L.models}:** ${report.models.join(", ")}`);
  out.push(`- **${L.qualityScore}:** ${report.scores.overall}/100 (${t.verdict[report.scores.verdict]})`);
  out.push(`- **${L.riskScore}:** ${report.scores.risk}/100 (${L.lowerIsBetter})`);
  if (report.findings.length) out.push(`- **${L.confidence}:** ${Math.round(report.scores.confidence * 100)}%`);
  out.push("");

  if (report.warnings.length) {
    out.push(`> **${L.warnings}:** ${report.warnings.join(" ")}`, "");
  }

  out.push(heading("summary"), "", report.executiveSummary.summary, "");
  if (report.executiveSummary.keyRisks.length) {
    out.push(`**${L.keyRisks}**`, "", ...report.executiveSummary.keyRisks.map((r) => `- ${r}`), "");
  }
  if (report.executiveSummary.strengths.length) {
    out.push(`**${L.strengths}**`, "", ...report.executiveSummary.strengths.map((s) => `- ${s}`), "");
  }

  out.push(heading("questions"), "");
  const questions = report.clarifyingQuestions ?? [];
  if (!questions.length) out.push(t.questions.none, "");
  else out.push(t.questions.intro, "");
  for (const q of questions) {
    out.push(`### ${q.id}: ${q.question}`, "");
    out.push(`- **${L.severity}:** ${t.severity[q.priority]}`);
    out.push(`- **${t.questions.askWho}:** ${t.audience[q.askWho]}`);
    if (q.requirementIds.length) out.push(`- **${L.affects}:** ${q.requirementIds.join(", ")}`);
    if (q.findingIds.length) out.push(`- **${t.questions.resolves}:** ${q.findingIds.join(", ")}`);
    if (q.why) out.push(`- **${t.questions.why}:** ${q.why}`);
    if (q.options.length) out.push(`- **${t.questions.options}:** ${q.options.join("; ")}`);
    out.push(`- **${t.questions.answer}:** ${answers[q.id]?.trim() || t.questions.noAnswer}`, "");
  }

  const s = report.document.stats;
  out.push(heading("overview"), "");
  if (report.document.summary) out.push(report.document.summary, "");
  out.push(
    `| ${L.totalRequirements} | ${L.words} | ${L.sections} | ${L.endpoints} | ${L.domain} |`,
    "|---|---|---|---|---|",
    `| ${report.requirements.length} | ${s.words} | ${s.sections} | ${report.endpoints.length} | ${cell(report.document.domain || "–")} |`,
    "",
  );
  out.push(`| ${L.id} | ${L.requirement} | ${L.type} | ${L.priority} | ${L.dependsOn} |`, "|---|---|---|---|---|");
  for (const r of report.requirements) {
    out.push(
      `| ${r.id}${r.sourceRef ? ` (${cell(r.sourceRef)})` : ""} | ${cell(r.text)} | ${t.requirementTypes[r.type]} | ${t.priorities[r.priority]} | ${r.dependsOn.join(", ") || "–"} |`,
    );
  }
  out.push("");
  if (report.duplicates.length) {
    out.push(`**${L.duplicates}:** ${report.duplicates.map((d) => `${d.a} ↔ ${d.b} (${Math.round(d.similarity * 100)}%)`).join("; ")}`, "");
  }

  out.push(heading("findings"), "");
  out.push(`| ${L.severity} | ${L.issuesFound} |`, "|---|---|");
  for (const sev of ["critical", "high", "medium", "low"] as const) {
    out.push(`| ${t.severity[sev]} | ${report.findings.filter((f) => f.severity === sev).length} |`);
  }
  out.push("");

  const renderFindings = (items: ReportFinding[]) => {
    if (!items.length) {
      out.push(L.noIssues, "");
      return;
    }
    for (const f of items) {
      out.push(`### ${f.id}: ${f.title}`, "");
      out.push(`- **${L.severity}:** ${t.severity[f.severity]}`);
      out.push(`- **${L.category}:** ${t.categories[f.category]}`);
      out.push(`- **${L.affects}:** ${f.requirementIds.join(", ") || L.documentLevel}${f.endpoint ? ` (\`${f.endpoint}\`)` : ""}`);
      if (f.standardRef) out.push(`- **${L.standard}:** ${f.standardRef}`);
      out.push(`- **${L.confidence}:** ${Math.round(f.confidence * 100)}%`, "");
      if (f.description) out.push(f.description, "");
      if (f.evidence) out.push(`> ${f.evidence}`, "");
      if (f.rationale) out.push(`**${L.rationale}:** ${f.rationale}`, "");
      if (f.recommendation) out.push(`**${L.recommendation}:** ${f.recommendation}`, "");
    }
  };

  out.push(heading("validation"), "");
  renderFindings(findingsForSection(report, "validation"));
  out.push(heading("api"), "");
  if (report.audit.some((a) => a.agent === "api" && a.status === "skipped")) out.push(L.apiSkipped, "");
  else renderFindings(findingsForSection(report, "api"));
  out.push(heading("security"), "");
  renderFindings(findingsForSection(report, "security"));

  out.push(heading("missing"), "");
  if (!report.missingRequirements.length) out.push(L.noIssues, "");
  for (const [i, m] of report.missingRequirements.entries()) {
    out.push(`### M-${i + 1}: ${m.title}`, "", `- **${L.severity}:** ${t.severity[m.severity]}`, "");
    if (m.description) out.push(m.description, "");
    if (m.suggestedRequirement) out.push(`**${L.suggested}:** ${m.suggestedRequirement}`, "");
    if (m.standardRef) out.push(`*${L.standard}: ${m.standardRef}*`, "");
  }

  out.push(heading("edgeCases"), "");
  if (!report.edgeCases.length) out.push(L.noIssues, "");
  else {
    out.push(`| ${L.severity} | ${L.scenario} | ${L.expected} | ${L.affects} |`, "|---|---|---|---|");
    for (const e of report.edgeCases) {
      out.push(`| ${t.severity[e.severity]} | ${cell(e.scenario)} | ${cell(e.expectedBehavior)} | ${e.requirementIds.join(", ") || "–"} |`);
    }
    out.push("");
  }

  out.push(heading("improvements"), "");
  if (!report.improvements.length) out.push(L.noIssues, "");
  for (const imp of report.improvements) {
    out.push(`### ${imp.requirementId}`, "");
    out.push(`**${L.original}:** ${imp.original}`, "");
    out.push(`**${L.improved}:** ${imp.improved}`, "");
    if (imp.explanation) out.push(`**${L.why}:** ${imp.explanation}`, "");
    if (imp.acceptanceCriteria.length) out.push(`**${L.acceptanceCriteria}:**`, "", ...imp.acceptanceCriteria.map((c) => `- ${c}`), "");
  }

  out.push(heading("score"), "");
  out.push(`**${L.qualityScore}: ${report.scores.overall}/100** (${t.verdict[report.scores.verdict]}). ${L.riskScore}: ${report.scores.risk}/100.`, "");
  out.push(`| ${L.category} | ${L.qualityScore} |`, "|---|---|");
  for (const d of DIMENSIONS) out.push(`| ${t.dimensions[d]} | ${report.scores.dimensions[d]} |`);
  out.push("", `*${L.howCalculated}:* ${L.scoreFormula}`, "");

  out.push(`## ${t.appendixAudit}`, "");
  out.push(`| ${L.agent} | ${L.status} | ${L.models} | ${L.duration} | ${L.detail} |`, "|---|---|---|---|---|");
  for (const a of report.audit) {
    const model = a.model && a.model !== "rules" && a.model !== "deterministic" ? a.model : "–";
    out.push(`| ${t.agents[a.agent]} | ${t.stepStatus[a.status]} | ${model} | ${formatDuration(a.durationMs, report.language)} | ${cell(t.describe(a.agent, a.status, a.metrics ?? {}) ?? a.detail)} |`);
  }
  out.push("");
  return out.join("\n");
}
