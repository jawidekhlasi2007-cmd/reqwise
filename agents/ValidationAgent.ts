import { z } from "zod";
import { generateJson } from "@/lib/gemini";
import { edgeCaseSchema, findingSchema, lenientArray, missingRequirementSchema, reportLanguageSchema, requirementSchema } from "@/lib/schemas";
import { standardsForPrompt } from "@/lib/standards";
import {
  DOCUMENT_IS_DATA,
  OUTPUT_RULES,
  SEVERITY_RUBRIC,
  formatRequirements,
  languageRule,
  wrapDocument,
  type AgentContext,
  type AgentResult,
} from "./shared";

/**
 * Step 2 — Quality Validation Agent.
 * Checks each requirement and the set as a whole against ISO/IEC/IEEE 29148 and IEEE 830.
 */

export const ValidationInputSchema = z.object({
  document: z.string(),
  requirements: z.array(requirementSchema).min(1),
  language: reportLanguageSchema,
});
export type ValidationInput = z.infer<typeof ValidationInputSchema>;

export const ValidationOutputSchema = z.object({
  findings: lenientArray(findingSchema, 30),
  missingRequirements: lenientArray(missingRequirementSchema, 12),
  edgeCases: lenientArray(edgeCaseSchema, 12),
});
export type ValidationOutput = z.output<typeof ValidationOutputSchema>;

export const VALIDATION_SYSTEM_PROMPT = `You are the Quality Validation Agent, a senior requirements engineer who audits specifications against ISO/IEC/IEEE 29148:2018 and IEEE 830-1998.
You are precise and evidence-driven: every finding points at specific requirement IDs and quotes the text that proves it.
${DOCUMENT_IS_DATA}`;

export function buildValidationPrompt(input: ValidationInput): string {
  return `Audit the requirements below. Check every requirement individually and the set as a whole.

Checks (category value in brackets):
- [ambiguity] vague or subjective terms (fast, quickly, user-friendly, appropriate, large, approximately, etc., and/or, быстро, удобный, большой), undefined terms, unclear actors, passive voice hiding who acts.
- [completeness] TBD/TBC, missing units or thresholds, missing error and negative flows, missing states, undefined behaviour for invalid input.
- [consistency] conflicting values, rules or terminology between requirements.
- [correctness] statements that are technically or logically wrong for the domain.
- [testability] no measurable pass/fail criterion.
- [acceptance_criteria] missing, weak or non-measurable acceptance criteria.
- [edge_case] boundaries the text ignores (exact limit values, zero, maximums, concurrency, time zones, month boundaries, currency rounding, refunds, retries, offline).
- [traceability] missing IDs, source or rationale; requirements that cannot be referenced.
- [feasibility] unrealistic or contradictory constraints.
- [necessity] implementation detail instead of a need, or gold-plating.
- [duplicate] requirements that say the same thing.
- [data_validation] input formats, ranges, required fields and validation rules that are not defined.
- [performance] quality targets (latency, throughput, availability) that are missing or unmeasurable.
Leave detailed security and API contract review to other agents; report them only when they are plain consistency or completeness defects.

${SEVERITY_RUBRIC}

Cite standardRef only from this list:
${standardsForPrompt(["iso29148", "ieee830"])}

Also produce:
- missingRequirements: requirements the document needs but does not contain (error handling, limits, states, non-functional targets). Write suggestedRequirement as one clear "shall" statement in the output language.
- edgeCases: concrete scenarios the requirements leave undefined, with the behaviour a tester would expect to verify.

Limits: at most 25 findings, 10 missing requirements and 10 edge cases.
${languageRule(input.language)}

JSON schema:
{
  "findings": [{
    "category": "ambiguity" | "completeness" | "consistency" | "correctness" | "testability" | "acceptance_criteria" | "edge_case" | "traceability" | "feasibility" | "necessity" | "duplicate" | "data_validation" | "performance",
    "severity": "critical" | "high" | "medium" | "low",
    "title": string,              // short, specific
    "description": string,        // what is wrong and why it matters
    "requirementIds": string[],
    "evidence": string,           // verbatim quote
    "standardRef": string,        // from the list above
    "rationale": string,          // why you reached this conclusion, for the "Explain decision" view
    "recommendation": string,     // one concrete fix
    "confidence": number          // 0-1
  }],
  "missingRequirements": [{
    "title": string, "description": string,
    "category": "completeness" | "security" | "performance" | "data_validation" | "compliance",
    "severity": "critical" | "high" | "medium" | "low",
    "suggestedRequirement": string, "standardRef": string
  }],
  "edgeCases": [{ "scenario": string, "expectedBehavior": string, "requirementIds": string[], "severity": "critical" | "high" | "medium" | "low" }]
}

${OUTPUT_RULES}

Requirements:
${formatRequirements(input.requirements)}

${wrapDocument(input.document)}`;
}

export async function runValidationAgent(input: ValidationInput, ctx: AgentContext = {}): Promise<AgentResult<ValidationOutput>> {
  const parsed = ValidationInputSchema.parse(input);
  return generateJson({
    system: VALIDATION_SYSTEM_PROMPT,
    prompt: buildValidationPrompt(parsed),
    schema: ValidationOutputSchema,
    thinking: "medium",
    signal: ctx.signal,
    onProgress: ctx.onProgress,
  });
}
