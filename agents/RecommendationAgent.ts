import { z } from "zod";
import { generateJson } from "@/lib/gemini";
import { executiveSummarySchema, findingSchema, improvementSchema, lenientArray, reportLanguageSchema, requirementSchema } from "@/lib/schemas";
import { DOCUMENT_IS_DATA, OUTPUT_RULES, formatFindings, formatRequirements, languageRule, type AgentContext, type AgentResult } from "./shared";

/**
 * Step 5 — Recommendation Agent.
 * Rewrites the most problematic requirements so they are unambiguous and testable,
 * and writes the executive summary from the already-computed scores.
 */

export const MAX_IMPROVEMENTS = 12;

export const RecommendationInputSchema = z.object({
  documentSummary: z.string(),
  requirements: z.array(requirementSchema),
  findings: z.array(findingSchema.extend({ id: z.string() })),
  missingTitles: z.array(z.string()),
  scores: z.object({ overall: z.number(), risk: z.number(), verdict: z.string() }),
  language: reportLanguageSchema,
});
export type RecommendationInput = z.infer<typeof RecommendationInputSchema>;

export const RecommendationOutputSchema = z.object({
  executiveSummary: executiveSummarySchema.catch({ summary: "", keyRisks: [], strengths: [] }),
  improvements: lenientArray(improvementSchema, MAX_IMPROVEMENTS),
});
export type RecommendationOutput = z.output<typeof RecommendationOutputSchema>;

export const RECOMMENDATION_SYSTEM_PROMPT = `You are the Recommendation Agent, a lead business analyst who rewrites defective requirements into clear, testable statements and briefs stakeholders.
Your rewrites follow ISO/IEC/IEEE 29148: one need per statement, an explicit actor, measurable values with units, explicit conditions, and verifiable acceptance criteria.
${DOCUMENT_IS_DATA}`;

export function buildRecommendationPrompt(input: RecommendationInput): string {
  return `Part A — executive summary.
Write "summary" (3-5 sentences) for a product owner: overall readiness, the most serious problem areas and what to fix first. The deterministic scores are: overall quality ${input.scores.overall}/100, risk ${input.scores.risk}/100, verdict "${input.scores.verdict}". Do not invent other numbers.
"keyRisks": up to 5 short bullet sentences. "strengths": up to 3 things the document does well (empty if none).

Part B — improved requirements.
For each requirement that has at least one finding (most severe first, at most ${MAX_IMPROVEMENTS}), produce:
- requirementId: the REQ-xxx id.
- original: the requirement text as given.
- improved: one rewritten requirement in the form "The system shall ..." (Russian: "Система должна ..."), fixing every listed finding for it. Use measurable values and units. When a value is a business decision you cannot know, insert a clearly marked placeholder such as [ASSUMPTION: 5 seconds] instead of inventing it silently.
- explanation: which findings the rewrite fixes and how.
- acceptanceCriteria: 2-4 criteria in Given / When / Then form (Russian: Дано / Когда / Тогда).

${languageRule(input.language)}

JSON schema:
{
  "executiveSummary": { "summary": string, "keyRisks": string[], "strengths": string[] },
  "improvements": [{ "requirementId": string, "original": string, "improved": string, "explanation": string, "acceptanceCriteria": string[] }]
}

${OUTPUT_RULES}

Document summary: ${input.documentSummary || "not available"}

Findings:
${formatFindings(input.findings)}

Missing requirements already identified: ${input.missingTitles.join("; ") || "none"}

Requirements with findings:
${formatRequirements(input.requirements)}`;
}

export async function runRecommendationAgent(
  input: RecommendationInput,
  ctx: AgentContext = {},
): Promise<AgentResult<RecommendationOutput>> {
  const parsed = RecommendationInputSchema.parse(input);
  const result = await generateJson({
    system: RECOMMENDATION_SYSTEM_PROMPT,
    prompt: buildRecommendationPrompt(parsed),
    schema: RecommendationOutputSchema,
    thinking: "low",
    signal: ctx.signal,
    onProgress: ctx.onProgress,
  });

  const known = new Set(parsed.requirements.map((r) => r.id));
  const seen = new Set<string>();
  const improvements = result.data.improvements.filter((imp) => {
    if (!known.has(imp.requirementId) || seen.has(imp.requirementId)) return false;
    seen.add(imp.requirementId);
    return true;
  });
  return { ...result, data: { ...result.data, improvements } };
}
