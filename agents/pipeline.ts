import { computeDocumentStats } from "@/lib/document-stats";
import { GeminiError } from "@/lib/gemini";
import { reportStrings } from "@/lib/i18n";
import { computeScores } from "@/lib/scoring";
import type { AgentName, AuditEntry, Finding, PipelineEvent, Report, ReportLanguage, StepMetrics } from "@/types";
import { runApiReviewAgent, type ApiReviewOutput } from "./ApiReviewAgent";
import { runClarificationAgent, type ClarificationOutput } from "./ClarificationAgent";
import { runExtractionAgent } from "./ExtractionAgent";
import { MAX_IMPROVEMENTS, runRecommendationAgent, type RecommendationOutput } from "./RecommendationAgent";
import { consolidateFindings, dedupeMissing, runReportAgent } from "./ReportAgent";
import { runRiskAgent, type RiskOutput } from "./RiskAgent";
import { MAX_PROMPT_DOCUMENT_CHARS, type AgentContext, type AgentResult } from "./shared";
import { runValidationAgent, type ValidationOutput } from "./ValidationAgent";

/*
 * Orchestrates the agents:
 *
 *   Extraction ──► Validation ─┐             ┌─► Clarification ─┐
 *              ├─► API review ─┼─► scoring ──┤                   ├─► Report
 *              └─► Risk ───────┘             └─► Recommendation ─┘
 *
 * Validation, API review and risk run in parallel, then clarification and
 * recommendation run in parallel. Extraction is required; any later agent may
 * fail and the report is still produced with a note. At most six model calls
 * per check (five when the document has no API).
 */

export interface PipelineInput {
  document: string;
  fileName: string;
  language: ReportLanguage;
}

export interface PipelineOptions {
  onEvent: (event: PipelineEvent) => void;
  signal?: AbortSignal;
}

export class PipelineError extends Error {
  readonly code: string;
  constructor(message: string, code = "pipeline_error") {
    super(message);
    this.name = "PipelineError";
    this.code = code;
  }
}

const PROGRESS_INTERVAL_MS = 400;
const english = reportStrings("en");

export async function runPipeline(input: PipelineInput, { onEvent, signal }: PipelineOptions): Promise<Report> {
  const audit: AuditEntry[] = [];
  const warnings: string[] = [];
  const models: string[] = [];

  const stats = computeDocumentStats(input.document);
  const truncated = input.document.length > MAX_PROMPT_DOCUMENT_CHARS;
  const document = truncated ? input.document.slice(0, MAX_PROMPT_DOCUMENT_CHARS) : input.document;

  const context = (agent: AgentName): AgentContext => {
    let last = 0;
    return {
      signal,
      onProgress: (chars) => {
        const now = Date.now();
        if (now - last < PROGRESS_INTERVAL_MS) return;
        last = now;
        onEvent({ type: "progress", agent, chars });
      },
    };
  };

  async function step<T>(
    agent: AgentName,
    run: (ctx: AgentContext) => Promise<AgentResult<T>>,
    measure: (data: T) => StepMetrics,
    required: boolean,
  ): Promise<AgentResult<T> | null> {
    const startedAt = new Date();
    onEvent({ type: "agent", agent, status: "running" });
    try {
      const result = await run(context(agent));
      const durationMs = Date.now() - startedAt.getTime();
      const metrics = measure(result.data);
      const detail = english.describe(agent, "done", metrics) ?? "Done";
      models.push(result.model);
      audit.push({ agent, status: "done", startedAt: startedAt.toISOString(), durationMs, model: result.model, detail, metrics, outputChars: result.outputChars });
      onEvent({ type: "agent", agent, status: "done", detail, metrics, model: result.model, durationMs });
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt.getTime();
      const message = error instanceof Error ? error.message : "Unknown error";
      const code = error instanceof GeminiError ? error.code : undefined;
      audit.push({ agent, status: "error", startedAt: startedAt.toISOString(), durationMs, detail: message });
      onEvent({ type: "agent", agent, status: "error", detail: message, code, durationMs });
      if (required || (error instanceof GeminiError && (error.code === "aborted" || error.code === "invalid_key"))) throw error;
      warnings.push(`${agent} agent failed: ${message}`);
      return null;
    }
  }

  function skip(agent: AgentName) {
    const detail = english.describe(agent, "skipped", {}) ?? "Skipped";
    audit.push({ agent, status: "skipped", startedAt: new Date().toISOString(), durationMs: 0, detail });
    onEvent({ type: "agent", agent, status: "skipped", detail });
  }

  // Step 1 — extraction (required).
  const extraction = await step(
    "extraction",
    (ctx) => runExtractionAgent({ document, language: input.language }, ctx),
    (d) => ({ requirements: d.requirements.length, endpoints: d.endpoints.length }),
    true,
  );
  const extracted = extraction!.data;
  if (extracted.requirements.length === 0) {
    throw new PipelineError(
      "No requirements were found. Upload a requirements document such as an SRS, BRD, user stories or an API specification.",
      "no_requirements",
    );
  }
  const { requirements, endpoints } = extracted;

  // Steps 2-4 — validation, API review and risk analysis in parallel.
  const hasApi = endpoints.length > 0 || stats.apiEndpoints > 0 || requirements.some((r) => r.type === "api");
  const [validation, api, risk] = await Promise.all([
    step<ValidationOutput>(
      "validation",
      (ctx) => runValidationAgent({ document, requirements, language: input.language }, ctx),
      (d) => ({ issues: d.findings.length, missing: d.missingRequirements.length, edgeCases: d.edgeCases.length }),
      false,
    ),
    hasApi
      ? step<ApiReviewOutput>(
          "api",
          (ctx) => runApiReviewAgent({ document, requirements, endpoints, language: input.language }, ctx),
          (d) => ({ issues: d.findings.length }),
          false,
        )
      : Promise.resolve(skip("api")).then(() => null),
    step<RiskOutput>(
      "risk",
      (ctx) => runRiskAgent({ document, requirements, domain: extracted.domain, language: input.language }, ctx),
      (d) => ({ issues: d.findings.length, missing: d.missingRequirements.length }),
      false,
    ),
  ]);

  if (!validation && !risk && !api) {
    throw new PipelineError("All analysis agents failed. Check the audit details and try again in a minute.", "agents_failed");
  }

  const bySource: Record<"validation" | "api" | "risk", Finding[]> = {
    validation: validation?.data.findings ?? [],
    api: api?.data.findings ?? [],
    risk: risk?.data.findings ?? [],
  };
  const knownIds = new Set(requirements.map((r) => r.id));
  const findings = consolidateFindings(bySource, knownIds);
  const missingRequirements = dedupeMissing([...(validation?.data.missingRequirements ?? []), ...(risk?.data.missingRequirements ?? [])]);
  const edgeCases = validation?.data.edgeCases ?? [];
  const scores = computeScores({ findings, missingRequirements, edgeCases, requirementCount: requirements.length });

  // Step 5 — clarifying questions and recommendations, in parallel.
  const targetIds: string[] = [];
  for (const f of findings) {
    for (const id of f.requirementIds) if (!targetIds.includes(id)) targetIds.push(id);
    if (targetIds.length >= MAX_IMPROVEMENTS) break;
  }
  const targets = requirements.filter((r) => targetIds.slice(0, MAX_IMPROVEMENTS).includes(r.id));
  const missingTitles = missingRequirements.map((m) => m.title);

  const [clarification, recommendation] = await Promise.all([
    step<ClarificationOutput>(
      "clarification",
      (ctx) =>
        runClarificationAgent(
          {
            document,
            documentSummary: extracted.summary,
            requirements,
            findings: findings.slice(0, 30),
            missingTitles,
            edgeCases,
            language: input.language,
          },
          ctx,
        ),
      (d) => ({ questions: d.questions.length }),
      false,
    ),
    findings.length === 0
      ? Promise.resolve(skip("recommendation")).then(() => null)
      : step<RecommendationOutput>(
          "recommendation",
          (ctx) =>
            runRecommendationAgent(
              {
                documentSummary: extracted.summary,
                requirements: targets,
                findings: findings.slice(0, 25),
                missingTitles,
                scores: { overall: scores.overall, risk: scores.risk, verdict: scores.verdict },
                language: input.language,
              },
              ctx,
            ),
          (d) => ({ rewritten: d.improvements.length }),
          false,
        ),
  ]);

  // Step 6 — deterministic report assembly and scoring.
  const reportStart = new Date();
  onEvent({ type: "agent", agent: "report", status: "running" });
  const report = runReportAgent({
    fileName: input.fileName,
    language: input.language,
    models,
    document: { title: extracted.documentTitle, domain: extracted.domain, summary: extracted.summary, stats, truncated, text: input.document },
    requirements,
    endpoints,
    findings: bySource,
    missingRequirements,
    edgeCases,
    improvements: recommendation?.data.improvements ?? [],
    clarifyingQuestions: clarification?.data.questions ?? null,
    executiveSummary: recommendation?.data.executiveSummary ?? null,
    audit,
    warnings,
  });
  const reportDuration = Date.now() - reportStart.getTime();
  const metrics: StepMetrics = { overall: report.scores.overall, risk: report.scores.risk };
  const detail = english.describe("report", "done", metrics) ?? "Done";
  report.audit.push({ agent: "report", status: "done", startedAt: reportStart.toISOString(), durationMs: reportDuration, detail, metrics, model: "rules" });
  onEvent({ type: "agent", agent: "report", status: "done", detail, metrics, durationMs: reportDuration });

  return report;
}
