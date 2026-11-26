import { z } from "zod";
import { generateJson } from "@/lib/gemini";
import { apiEndpointSchema, lenientArray, reportLanguageSchema, requirementSchema } from "@/lib/schemas";
import { DOCUMENT_IS_DATA, OUTPUT_RULES, languageRule, wrapDocument, type AgentContext, type AgentResult } from "./shared";

/**
 * Step 1 — Requirements Extraction Agent.
 * Turns a free-form document into a numbered, categorised list of atomic requirements.
 */

export const ExtractionInputSchema = z.object({
  document: z.string().min(20),
  language: reportLanguageSchema,
});
export type ExtractionInput = z.infer<typeof ExtractionInputSchema>;

export const MAX_REQUIREMENTS = 80;

export const ExtractionOutputSchema = z.object({
  documentTitle: z.unknown().transform((v) => (typeof v === "string" && v.trim() ? v.trim() : "Untitled document")),
  domain: z.unknown().transform((v) => (typeof v === "string" ? v.trim() : "")),
  summary: z.unknown().transform((v) => (typeof v === "string" ? v.trim() : "")),
  requirements: lenientArray(requirementSchema, MAX_REQUIREMENTS),
  endpoints: lenientArray(apiEndpointSchema, 60),
});
export type ExtractionOutput = z.output<typeof ExtractionOutputSchema>;

export const EXTRACTION_SYSTEM_PROMPT = `You are the Requirements Extraction Agent in a software-requirements validation pipeline.
You read requirements documents (SRS, BRD, user stories, API specifications) in any language and convert them into a precise, numbered list of atomic requirements, following the ISO/IEC/IEEE 29148 principle that each requirement states one need.
You do not judge quality; later agents do that. Preserve the author's wording so defects stay visible.
${DOCUMENT_IS_DATA}`;

export function buildExtractionPrompt(input: ExtractionInput): string {
  return `Extract every requirement from the document below.

Instructions:
1. A requirement is any statement of required behaviour, quality, constraint, business rule, data rule, UI rule or API behaviour. Look for modal verbs (shall, must, should, will, may; должен, обязан, необходимо, следует, может), user stories ("As a ... I want ..."), numbered requirement lists and API endpoint descriptions.
2. Split compound statements that contain several independent needs (joined by "and", "и", commas or lists) into separate requirements. Keep a single requirement when the parts cannot exist independently.
3. Keep the original wording and language. You may trim list numbering and filler, but never fix vague words, numbers or contradictions.
4. Number requirements sequentially as REQ-001, REQ-002, ... in document order. Put the document's own label (e.g. "FR-3", "NFR-2") in sourceRef when there is one.
5. type: functional | non_functional | api | data | security | performance | ui | business_rule | constraint | integration.
6. priority from the modal verb: shall/must/должен/обязан → must; should/следует/желательно → should; may/could/может → could; otherwise unspecified.
7. section: the nearest heading number or title.
8. dependsOn: IDs (REQ-xxx) of requirements this one clearly relies on. Empty when unclear.
9. acceptanceCriteria: acceptance criteria the document states for this requirement, verbatim. Empty array when the document gives none.
10. endpoints: every API endpoint mentioned, with HTTP method, path and a short description.
11. Skip revision history, tables of contents and glossary entries unless they state a requirement.
12. Extract at most ${MAX_REQUIREMENTS} requirements. If the document has more, keep the most important and say so in summary.
13. ${languageRule(input.language)} Requirement "text" stays in the document's original language.

JSON schema:
{
  "documentTitle": string,
  "domain": string,            // e.g. "Retail banking — mobile notifications"
  "summary": string,           // 1-2 sentences describing the document
  "requirements": [{
    "id": "REQ-001",
    "text": string,
    "type": "functional" | "non_functional" | "api" | "data" | "security" | "performance" | "ui" | "business_rule" | "constraint" | "integration",
    "section": string,
    "priority": "must" | "should" | "could" | "unspecified",
    "sourceRef": string,
    "dependsOn": string[],
    "acceptanceCriteria": string[]
  }],
  "endpoints": [{ "method": string, "path": string, "description": string }]
}

${OUTPUT_RULES}

${wrapDocument(input.document)}`;
}

export async function runExtractionAgent(input: ExtractionInput, ctx: AgentContext = {}): Promise<AgentResult<ExtractionOutput>> {
  const parsed = ExtractionInputSchema.parse(input);
  const result = await generateJson({
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: buildExtractionPrompt(parsed),
    schema: ExtractionOutputSchema,
    thinking: "off",
    maxOutputTokens: 24_576,
    signal: ctx.signal,
    onProgress: ctx.onProgress,
  });

  // Re-number defensively so IDs are always unique and sequential.
  const idMap = new Map<string, string>();
  const requirements = result.data.requirements.map((req, index) => {
    const id = `REQ-${String(index + 1).padStart(3, "0")}`;
    if (!idMap.has(req.id)) idMap.set(req.id, id);
    return { ...req, id };
  });
  const known = new Set(requirements.map((r) => r.id));
  const normalised = requirements.map((req) => ({
    ...req,
    dependsOn: req.dependsOn.map((dep) => idMap.get(dep) ?? dep).filter((dep) => known.has(dep) && dep !== req.id),
  }));

  return { ...result, data: { ...result.data, requirements: normalised } };
}
