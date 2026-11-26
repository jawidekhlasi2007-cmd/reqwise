import { z } from "zod";
import { generateJson } from "@/lib/gemini";
import { clarifyingQuestionSchema, edgeCaseSchema, findingSchema, lenientArray, reportLanguageSchema, requirementSchema } from "@/lib/schemas";
import { DOCUMENT_IS_DATA, OUTPUT_RULES, formatFindings, formatRequirements, languageRule, wrapDocument, type AgentContext, type AgentResult } from "./shared";

/**
 * Step 5a — Clarification Agent.
 * Writes the questions the team must ask the specification's author before development
 * can start. Runs at the same time as the Recommendation Agent. The user can answer the
 * questions in the report and re-check the document with the answers added to it.
 */

export const MAX_QUESTIONS = 12;

export const ClarificationInputSchema = z.object({
  document: z.string(),
  documentSummary: z.string(),
  requirements: z.array(requirementSchema),
  findings: z.array(findingSchema.extend({ id: z.string() })),
  missingTitles: z.array(z.string()),
  edgeCases: z.array(edgeCaseSchema),
  language: reportLanguageSchema,
});
export type ClarificationInput = z.infer<typeof ClarificationInputSchema>;

export const ClarificationOutputSchema = z.object({
  questions: lenientArray(clarifyingQuestionSchema, MAX_QUESTIONS),
});
export type ClarificationOutput = z.output<typeof ClarificationOutputSchema>;

export const CLARIFICATION_SYSTEM_PROMPT = `You are the Clarification Agent, a senior business analyst preparing a requirements review meeting for a fintech product.
Your job is to ask the specification's author the questions that must be answered before design, development and testing can start.
You ask few, sharp, answerable questions, in plain language a product owner understands.
${DOCUMENT_IS_DATA}`;

export function buildClarificationPrompt(input: ClarificationInput): string {
  const missing = input.missingTitles.length ? input.missingTitles.map((m) => `- ${m}`).join("\n") : "- none";
  const edgeCases = input.edgeCases.length ? input.edgeCases.map((e) => `- ${e.scenario}`).join("\n") : "- none";

  return `Write the clarifying questions the team must ask the author of this specification.

What makes a good question:
- It targets a gap, contradiction or vague term found by the other agents, or anything else that blocks design, development or testing.
- It asks about exactly one decision and can be answered in one or two sentences.
- It names the exact value, term or behaviour in doubt, with requirement IDs. Example: "REQ-004 says 90% but REQ-021 says 80%. Which warning threshold is correct?"
- When the decision has typical choices, offer 2-4 realistic, mutually exclusive answer options in "options". Leave "options" empty for open questions.
- It never asks something the document already answers. If the document contains a section with answers to earlier questions, treat those answers as settled and do not ask them again.
- Questions with the biggest impact come first: blockers and financial, legal or security risks.

priority: critical = development cannot start, or there is a legal, financial or security risk; high = a core behaviour is undefined; medium = a secondary flow or value is unclear; low = worth confirming.
askWho: business (product owner or analyst) | tech (architect or developers) | security | compliance (legal and regulatory) | design (UX) — who should answer.
why: one sentence on what goes wrong if the question stays unanswered.
findingIds: IDs (F-xx) of the problems below that the question resolves.

Write ${Math.min(6, MAX_QUESTIONS)}-${MAX_QUESTIONS} questions; fewer if the document is short and clear.
${languageRule(input.language)}

JSON schema:
{
  "questions": [{
    "question": string,
    "why": string,
    "askWho": "business" | "tech" | "security" | "compliance" | "design",
    "priority": "critical" | "high" | "medium" | "low",
    "requirementIds": string[],
    "findingIds": string[],
    "options": string[]
  }]
}

${OUTPUT_RULES}

Document summary: ${input.documentSummary || "not available"}

Problems found by the other agents:
${formatFindings(input.findings) || "none"}

Missing requirements:
${missing}

Edge cases not covered:
${edgeCases}

Requirements:
${formatRequirements(input.requirements)}

${wrapDocument(input.document)}`;
}

export async function runClarificationAgent(input: ClarificationInput, ctx: AgentContext = {}): Promise<AgentResult<ClarificationOutput>> {
  const parsed = ClarificationInputSchema.parse(input);
  return generateJson({
    system: CLARIFICATION_SYSTEM_PROMPT,
    prompt: buildClarificationPrompt(parsed),
    schema: ClarificationOutputSchema,
    thinking: "low",
    signal: ctx.signal,
    onProgress: ctx.onProgress,
  });
}
