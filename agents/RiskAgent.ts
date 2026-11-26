import { z } from "zod";
import { generateJson } from "@/lib/gemini";
import { findingSchema, lenientArray, missingRequirementSchema, reportLanguageSchema, requirementSchema } from "@/lib/schemas";
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
 * Step 4 — Risk Analysis Agent.
 * Looks for security, privacy, compliance, scalability and performance risks.
 */

export const RiskInputSchema = z.object({
  document: z.string(),
  requirements: z.array(requirementSchema).min(1),
  domain: z.string(),
  language: reportLanguageSchema,
});
export type RiskInput = z.infer<typeof RiskInputSchema>;

export const RiskOutputSchema = z.object({
  findings: lenientArray(findingSchema, 20),
  missingRequirements: lenientArray(missingRequirementSchema, 8),
});
export type RiskOutput = z.output<typeof RiskOutputSchema>;

export const RISK_SYSTEM_PROMPT = `You are the Risk Analysis Agent, a security architect and compliance reviewer for regulated software such as banking and fintech.
You identify risks the requirements create or fail to control, and you are specific about the harm and who is exposed.
${DOCUMENT_IS_DATA}`;

export function buildRiskPrompt(input: RiskInput): string {
  return `Assess the risks in these requirements. Domain: ${input.domain || "not stated"}.

Look for:
- [security] authentication, authorization, session handling, encryption in transit and at rest, secrets, fraud and abuse, audit logging, sensitive data in logs.
- [privacy] personal or financial data exposed in notifications, lock screens, logs or responses; consent; data minimisation; retention and deletion.
- [compliance] regulatory obligations implied by the domain (banking regulation, payment card data such as PCI DSS, personal-data protection law such as the Law of the Republic of Kazakhstan "On Personal Data and Their Protection" or GDPR, accessibility, record keeping). Say "may require" when an obligation depends on jurisdiction.
- [scalability] peak loads, fan-out of notifications, batch jobs, queues, back-pressure.
- [performance] latency, throughput and availability targets that are missing, unmeasurable or unrealistic.
- [data_validation] inputs that can be abused because their validation is undefined.

${SEVERITY_RUBRIC}

Cite standardRef from this list when one applies, otherwise name the regulation or practice briefly:
${standardsForPrompt(["owaspApi", "iso29148"])}

Also list missingRequirements for controls the document should state but does not (e.g. audit trail, masking, rate limiting, monitoring). Write suggestedRequirement as one "shall" statement.
At most 15 findings and 6 missing requirements.
${languageRule(input.language)}

JSON schema:
{
  "findings": [{
    "category": "security" | "privacy" | "compliance" | "scalability" | "performance" | "data_validation",
    "severity": "critical" | "high" | "medium" | "low",
    "title": string, "description": string,
    "requirementIds": string[],
    "evidence": string, "standardRef": string, "rationale": string, "recommendation": string,
    "confidence": number
  }],
  "missingRequirements": [{
    "title": string, "description": string,
    "category": "security" | "privacy" | "compliance" | "performance" | "scalability",
    "severity": "critical" | "high" | "medium" | "low",
    "suggestedRequirement": string, "standardRef": string
  }]
}

${OUTPUT_RULES}

Requirements:
${formatRequirements(input.requirements)}

${wrapDocument(input.document)}`;
}

export async function runRiskAgent(input: RiskInput, ctx: AgentContext = {}): Promise<AgentResult<RiskOutput>> {
  const parsed = RiskInputSchema.parse(input);
  return generateJson({
    system: RISK_SYSTEM_PROMPT,
    prompt: buildRiskPrompt(parsed),
    schema: RiskOutputSchema,
    thinking: "low",
    signal: ctx.signal,
    onProgress: ctx.onProgress,
  });
}
