import { z } from "zod";
import { findDuplicateRequirements, textSimilarity } from "@/lib/duplicates";
import { REPORT_SECTION_ORDER, reportStrings, type ReportSectionId } from "@/lib/i18n";
import {
  apiEndpointSchema,
  clarifyingQuestionSchema,
  edgeCaseSchema,
  executiveSummarySchema,
  findingSchema,
  improvementSchema,
  missingRequirementSchema,
  reportLanguageSchema,
  requirementSchema,
} from "@/lib/schemas";
import { computeScores, severityRank } from "@/lib/scoring";
import { createId } from "@/lib/utils";
import type {
  AuditEntry,
  ClarifyingQuestion,
  DocumentStats,
  Finding,
  FindingSource,
  MissingRequirement,
  Report,
  ReportFinding,
  ReportLanguage,
  ReportQuestion,
} from "@/types";

/**
 * Step 6 — Report Agent.
 *
 * Deliberately deterministic: it does not call the model. It merges the other
 * agents' output, removes duplicates and low-confidence noise, computes the
 * scores, and assembles the report. Its "template" is the fixed section
 * outline below, shared by the screen view and every export, so scores and
 * structure are reproducible and auditable.
 */

export const REPORT_TEMPLATE: ReadonlyArray<{ id: ReportSectionId; number: number }> = REPORT_SECTION_ORDER.map((id, index) => ({
  id,
  number: index + 1,
}));

/** Findings below this confidence are treated as noise and dropped. */
export const MIN_CONFIDENCE = 0.45;

export const ReportInputSchema = z.object({
  fileName: z.string(),
  language: reportLanguageSchema,
  models: z.array(z.string()),
  document: z.object({
    title: z.string(),
    domain: z.string(),
    summary: z.string(),
    stats: z.custom<DocumentStats>((v) => typeof v === "object" && v !== null),
    truncated: z.boolean(),
    text: z.string().optional(),
  }),
  requirements: z.array(requirementSchema),
  endpoints: z.array(apiEndpointSchema),
  findings: z.object({
    validation: z.array(findingSchema),
    api: z.array(findingSchema),
    risk: z.array(findingSchema),
  }),
  missingRequirements: z.array(missingRequirementSchema),
  edgeCases: z.array(edgeCaseSchema),
  improvements: z.array(improvementSchema),
  /** null when the Clarification Agent did not run or failed; rule-based questions are used instead. */
  clarifyingQuestions: z.array(clarifyingQuestionSchema).nullable(),
  executiveSummary: executiveSummarySchema.nullable(),
  audit: z.array(z.custom<AuditEntry>()),
  warnings: z.array(z.string()),
  id: z.string().optional(),
  createdAt: z.string().optional(),
});
export type ReportInput = z.input<typeof ReportInputSchema>;

const SOURCE_ORDER: FindingSource[] = ["validation", "api", "risk"];

/** Merges findings from all agents, removes near-duplicates and noise, sorts by severity and assigns IDs. */
export function consolidateFindings(bySource: Record<FindingSource, Finding[]>, knownRequirementIds: Set<string>): ReportFinding[] {
  const merged: Array<Finding & { source: FindingSource }> = [];

  for (const source of SOURCE_ORDER) {
    for (const raw of bySource[source]) {
      if (raw.confidence < MIN_CONFIDENCE) continue;
      const finding = { ...raw, source, requirementIds: raw.requirementIds.filter((id) => knownRequirementIds.has(id)) };

      const twin = merged.find(
        (m) =>
          m.category === finding.category &&
          sameIds(m.requirementIds, finding.requirementIds) &&
          textSimilarity(m.title, finding.title) >= 0.5,
      );
      if (!twin) {
        merged.push(finding);
      } else if (severityRank(finding.severity) < severityRank(twin.severity)) {
        Object.assign(twin, finding);
      }
    }
  }

  merged.sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source) ||
      b.confidence - a.confidence,
  );
  const width = merged.length >= 100 ? 3 : 2;
  return merged.map((f, i) => ({ ...f, id: `F-${String(i + 1).padStart(width, "0")}` }));
}

export function dedupeMissing(items: MissingRequirement[]): MissingRequirement[] {
  const result: MissingRequirement[] = [];
  for (const item of items) {
    if (!result.some((r) => textSimilarity(r.title, item.title) >= 0.6)) result.push(item);
  }
  return result.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

/** Documents longer than this are not stored with the report (keeps browser storage small). */
const MAX_STORED_TEXT = 120_000;

/** Rule-based questions used when the Clarification Agent is unavailable. */
function fallbackQuestions(findings: ReportFinding[], missing: MissingRequirement[], language: ReportLanguage): ClarifyingQuestion[] {
  const ask = language === "ru" ? (topic: string) => `Уточните: ${topic}` : (topic: string) => `Please clarify: ${topic}`;
  const fromFindings = findings
    .filter((f) => ["ambiguity", "consistency", "completeness", "testability", "edge_case"].includes(f.category))
    .slice(0, 6)
    .map((f) => ({
      question: ask(f.title),
      why: f.description,
      askWho: "business" as const,
      priority: f.severity,
      requirementIds: f.requirementIds,
      findingIds: [f.id],
      options: [],
    }));
  const fromMissing = missing.slice(0, 4).map((m) => ({
    question: ask(m.title),
    why: m.description,
    askWho: (m.category === "security" || m.category === "privacy" ? "security" : m.category === "compliance" ? "compliance" : "business") as ClarifyingQuestion["askWho"],
    priority: m.severity,
    requirementIds: [],
    findingIds: [],
    options: [],
  }));
  return [...fromFindings, ...fromMissing];
}

function finaliseQuestions(questions: ClarifyingQuestion[], knownRequirements: Set<string>, knownFindings: Set<string>): ReportQuestion[] {
  const seen: ClarifyingQuestion[] = [];
  for (const q of questions) {
    if (!seen.some((s) => textSimilarity(s.question, q.question) >= 0.7)) seen.push(q);
  }
  return seen
    .map((q, index) => ({ q, index }))
    .sort((a, b) => severityRank(a.q.priority) - severityRank(b.q.priority) || a.index - b.index)
    .map(({ q }, i) => ({
      ...q,
      id: `Q-${String(i + 1).padStart(2, "0")}`,
      requirementIds: q.requirementIds.filter((id) => knownRequirements.has(id)),
      findingIds: q.findingIds.filter((id) => knownFindings.has(id)),
    }));
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export function runReportAgent(rawInput: ReportInput): Report {
  const input = ReportInputSchema.parse(rawInput);
  const knownIds = new Set(input.requirements.map((r) => r.id));
  const findings = consolidateFindings(input.findings, knownIds);
  const missingRequirements = dedupeMissing(input.missingRequirements);
  const edgeCases = input.edgeCases
    .map((e) => ({ ...e, requirementIds: e.requirementIds.filter((id) => knownIds.has(id)) }))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const scores = computeScores({ findings, missingRequirements, edgeCases, requirementCount: input.requirements.length });
  const t = reportStrings(input.language);

  const executiveSummary =
    input.executiveSummary && input.executiveSummary.summary
      ? input.executiveSummary
      : {
          summary: t.fallbackSummary({
            requirements: input.requirements.length,
            issues: findings.length,
            critical: findings.filter((f) => f.severity === "critical").length,
            high: findings.filter((f) => f.severity === "high").length,
            overall: scores.overall,
            verdict: t.verdict[scores.verdict],
          }),
          keyRisks: findings.filter((f) => f.severity === "critical" || f.severity === "high").slice(0, 5).map((f) => f.title),
          strengths: [],
        };

  const improvements = input.improvements.filter((imp) => knownIds.has(imp.requirementId));
  const clarifyingQuestions = finaliseQuestions(
    input.clarifyingQuestions ?? fallbackQuestions(findings, missingRequirements, input.language),
    knownIds,
    new Set(findings.map((f) => f.id)),
  );
  const warnings = [...input.warnings];
  if (input.document.truncated) warnings.unshift(t.labels.truncated);

  return {
    version: 1,
    id: input.id ?? createId(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    fileName: input.fileName,
    language: input.language,
    models: Array.from(new Set(input.models)),
    document: {
      ...input.document,
      text: input.document.text && input.document.text.length <= MAX_STORED_TEXT ? input.document.text : undefined,
    },
    requirements: input.requirements,
    endpoints: input.endpoints,
    findings,
    missingRequirements,
    edgeCases,
    improvements,
    clarifyingQuestions,
    duplicates: findDuplicateRequirements(input.requirements),
    executiveSummary,
    scores,
    audit: input.audit,
    warnings,
  };
}

/** Number of findings that reference each requirement, for the requirements table. */
export function issueCountByRequirement(report: Pick<Report, "findings">): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of report.findings) {
    for (const id of f.requirementIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Splits findings into the three report sections. Security also collects security-type findings from the API agent. */
export function findingsForSection(report: Pick<Report, "findings">, section: "validation" | "api" | "security"): ReportFinding[] {
  if (section === "validation") return report.findings.filter((f) => f.source === "validation");
  if (section === "api") return report.findings.filter((f) => f.source === "api" && f.category !== "security");
  return report.findings.filter((f) => f.source === "risk" || (f.source === "api" && f.category === "security"));
}
