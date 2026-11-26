import { z } from "zod";
import { generateJson } from "@/lib/gemini";
import { apiEndpointSchema, findingSchema, lenientArray, reportLanguageSchema, requirementSchema } from "@/lib/schemas";
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
 * Step 3 — API Analysis Agent.
 * Reviews API contracts: status codes, schemas, validation, authentication and ambiguity.
 * The pipeline skips this agent when the document describes no API, saving free-tier quota.
 */

export const ApiReviewInputSchema = z.object({
  document: z.string(),
  requirements: z.array(requirementSchema),
  endpoints: z.array(apiEndpointSchema),
  language: reportLanguageSchema,
});
export type ApiReviewInput = z.infer<typeof ApiReviewInputSchema>;

export const ApiReviewOutputSchema = z.object({
  findings: lenientArray(findingSchema, 20),
});
export type ApiReviewOutput = z.output<typeof ApiReviewOutputSchema>;

export const API_REVIEW_SYSTEM_PROMPT = `You are the API Analysis Agent, a principal backend engineer who reviews API specifications before implementation.
You find contract defects that would cause integration bugs, security holes or untestable behaviour.
${DOCUMENT_IS_DATA}`;

export function buildApiReviewPrompt(input: ApiReviewInput): string {
  const endpoints = input.endpoints.length
    ? input.endpoints.map((e) => `- ${e.method} ${e.path}${e.description ? ` — ${e.description}` : ""}`).join("\n")
    : "- No explicit endpoint list was extracted; infer the API surface from the requirements and document.";

  return `Review the API described in this document.

Check every endpoint for:
- Status codes: errors returned as 200, missing 400/401/403/404/409/422/429/5xx cases, 401 vs 403 confusion, wrong codes for create (201) or async work (202).
- Schemas: missing request or response bodies, undefined field types, formats, units, currency, nullability, error body format.
- Validation: required fields, ranges, lengths, enums and what happens on invalid input.
- Authentication and authorization: no authentication stated, identifiers taken from the request body or path that let a caller act for another customer (object-level authorization), internal endpoints exposed to clients.
- Contract clarity: idempotency of retried POSTs, pagination, rate limits, versioning, timeouts, ambiguous behaviour.
Use category "api_contract" for contract defects, "security" for authentication or authorization gaps, "data_validation" for missing input validation and "performance" for missing limits. Always fill "endpoint" with "METHOD /path".

${SEVERITY_RUBRIC}

Cite standardRef only from this list:
${standardsForPrompt(["owaspApi", "http", "iso29148"])}

At most 15 findings.
${languageRule(input.language)}

JSON schema:
{
  "findings": [{
    "category": "api_contract" | "security" | "data_validation" | "performance",
    "severity": "critical" | "high" | "medium" | "low",
    "title": string, "description": string,
    "endpoint": string,
    "requirementIds": string[],
    "evidence": string, "standardRef": string, "rationale": string, "recommendation": string,
    "confidence": number
  }]
}

${OUTPUT_RULES}

Endpoints:
${endpoints}

Requirements:
${formatRequirements(input.requirements)}

${wrapDocument(input.document)}`;
}

export async function runApiReviewAgent(input: ApiReviewInput, ctx: AgentContext = {}): Promise<AgentResult<ApiReviewOutput>> {
  const parsed = ApiReviewInputSchema.parse(input);
  return generateJson({
    system: API_REVIEW_SYSTEM_PROMPT,
    prompt: buildApiReviewPrompt(parsed),
    schema: ApiReviewOutputSchema,
    thinking: "low",
    signal: ctx.signal,
    onProgress: ctx.onProgress,
  });
}
