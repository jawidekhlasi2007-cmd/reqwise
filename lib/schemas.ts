import { z } from "zod";

/*
 * Shared Zod schemas for everything the agents produce.
 *
 * LLM output is never perfectly shaped, so these schemas are deliberately
 * forgiving: enums are normalised (case, synonyms), missing optional fields
 * fall back to defaults, and invalid list items are dropped instead of
 * failing the whole response.
 */

export const REPORT_LANGUAGES = ["en", "ru"] as const;
export type ReportLanguage = (typeof REPORT_LANGUAGES)[number];
export const reportLanguageSchema = z.enum(REPORT_LANGUAGES);

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ISSUE_CATEGORIES = [
  "ambiguity",
  "completeness",
  "consistency",
  "correctness",
  "testability",
  "acceptance_criteria",
  "edge_case",
  "traceability",
  "feasibility",
  "necessity",
  "duplicate",
  "security",
  "privacy",
  "compliance",
  "performance",
  "scalability",
  "data_validation",
  "api_contract",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const REQUIREMENT_TYPES = [
  "functional",
  "non_functional",
  "api",
  "data",
  "security",
  "performance",
  "ui",
  "business_rule",
  "constraint",
  "integration",
] as const;
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

export const PRIORITIES = ["must", "should", "could", "unspecified"] as const;
export type Priority = (typeof PRIORITIES)[number];

const CATEGORY_SYNONYMS: Record<string, IssueCategory> = {
  ambiguous: "ambiguity",
  vague: "ambiguity",
  clarity: "ambiguity",
  missing: "completeness",
  incomplete: "completeness",
  missing_requirement: "completeness",
  inconsistent: "consistency",
  inconsistency: "consistency",
  conflict: "consistency",
  contradiction: "consistency",
  incorrect: "correctness",
  non_testable: "testability",
  not_testable: "testability",
  untestable: "testability",
  verifiability: "testability",
  verifiable: "testability",
  acceptance: "acceptance_criteria",
  weak_acceptance_criteria: "acceptance_criteria",
  edge_cases: "edge_case",
  boundary: "edge_case",
  uniqueness: "duplicate",
  duplication: "duplicate",
  redundancy: "duplicate",
  data_privacy: "privacy",
  regulatory: "compliance",
  scalability_issue: "scalability",
  validation: "data_validation",
  input_validation: "data_validation",
  api: "api_contract",
  api_specification: "api_contract",
  contract: "api_contract",
  status_code: "api_contract",
  authentication: "security",
  authorization: "security",
};

function normaliseToken(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export const severitySchema = z
  .preprocess(normaliseToken, z.enum(SEVERITIES))
  .catch("medium");

export const issueCategorySchema = z
  .preprocess((value) => {
    const token = normaliseToken(value);
    if (typeof token !== "string") return token;
    return CATEGORY_SYNONYMS[token] ?? token;
  }, z.enum(ISSUE_CATEGORIES))
  .catch("correctness");

export const requirementTypeSchema = z
  .preprocess((value) => {
    const token = normaliseToken(value);
    if (token === "nonfunctional" || token === "nfr") return "non_functional";
    if (token === "business" || token === "rule") return "business_rule";
    return token;
  }, z.enum(REQUIREMENT_TYPES))
  .catch("functional");

export const prioritySchema = z
  .preprocess((value) => {
    const token = normaliseToken(value);
    if (token === "shall" || token === "mandatory" || token === "high") return "must";
    if (token === "may" || token === "optional" || token === "low") return "could";
    return token;
  }, z.enum(PRIORITIES))
  .catch("unspecified");

/** Accepts 0-1 or 0-100 (and numeric strings); anything unparseable becomes 0.7. */
export const confidenceSchema = z
  .preprocess((v) => (typeof v === "string" ? Number.parseFloat(v) : v), z.number().finite())
  .transform((n) => {
    const scaled = n > 1 ? n / 100 : n;
    return Math.round(Math.min(1, Math.max(0, scaled)) * 100) / 100;
  })
  .catch(0.7);

/** Strings and numbers become trimmed text; null, undefined and objects become "". */
function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

const text = () => z.unknown().transform(toText);
const optionalText = () =>
  z
    .unknown()
    .transform(toText)
    .transform((v) => (v ? v : undefined));
const textList = () =>
  z
    .unknown()
    .transform((value) => (Array.isArray(value) ? value.map(toText).filter(Boolean) : []));
const idList = () => textList().transform((ids) => Array.from(new Set(ids)));

/** An array schema that silently drops items that fail validation. */
export function lenientArray<T extends z.ZodTypeAny>(item: T, max = 200) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((items): z.output<T>[] =>
      items
        .flatMap((raw) => {
          const parsed = item.safeParse(raw);
          return parsed.success ? [parsed.data as z.output<T>] : [];
        })
        .slice(0, max),
    );
}

/* ---------- Building blocks shared by several agents ---------- */

export const requirementSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(3),
  type: requirementTypeSchema,
  section: text(),
  priority: prioritySchema,
  sourceRef: optionalText(),
  dependsOn: idList(),
  acceptanceCriteria: textList(),
});
export type Requirement = z.output<typeof requirementSchema>;

export const apiEndpointSchema = z.object({
  method: z
    .preprocess((v) => (typeof v === "string" ? v.trim().toUpperCase() : v), z.string().min(1))
    .catch("GET"),
  path: z.string().trim().min(1),
  description: text(),
});
export type ApiEndpoint = z.output<typeof apiEndpointSchema>;

export const findingSchema = z.object({
  category: issueCategorySchema,
  severity: severitySchema,
  title: z.string().trim().min(3),
  description: text(),
  requirementIds: idList(),
  evidence: text(),
  standardRef: text(),
  rationale: text(),
  recommendation: text(),
  confidence: confidenceSchema,
  endpoint: optionalText(),
});
export type Finding = z.output<typeof findingSchema>;

export const missingRequirementSchema = z.object({
  title: z.string().trim().min(3),
  description: text(),
  category: issueCategorySchema,
  severity: severitySchema,
  suggestedRequirement: text(),
  standardRef: text(),
});
export type MissingRequirement = z.output<typeof missingRequirementSchema>;

export const edgeCaseSchema = z.object({
  scenario: z.string().trim().min(3),
  expectedBehavior: text(),
  requirementIds: idList(),
  severity: severitySchema,
});
export type EdgeCase = z.output<typeof edgeCaseSchema>;

export const improvementSchema = z.object({
  requirementId: z.string().trim().min(1),
  original: text(),
  improved: z.string().trim().min(3),
  explanation: text(),
  acceptanceCriteria: textList(),
});
export type Improvement = z.output<typeof improvementSchema>;

export const AUDIENCES = ["business", "tech", "security", "compliance", "design"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const audienceSchema = z
  .preprocess((value) => {
    const token = normaliseToken(value);
    if (token === "product_owner" || token === "product" || token === "analyst" || token === "business_analyst") return "business";
    if (token === "architect" || token === "developer" || token === "engineering" || token === "technical") return "tech";
    if (token === "legal" || token === "regulatory") return "compliance";
    if (token === "ux" || token === "ui") return "design";
    return token;
  }, z.enum(AUDIENCES))
  .catch("business");

export const clarifyingQuestionSchema = z.object({
  question: z.string().trim().min(5),
  why: text(),
  askWho: audienceSchema,
  priority: severitySchema,
  requirementIds: idList(),
  findingIds: idList(),
  options: textList().transform((items) => items.slice(0, 4)),
});
export type ClarifyingQuestion = z.output<typeof clarifyingQuestionSchema>;

export const executiveSummarySchema = z.object({
  summary: text(),
  keyRisks: textList(),
  strengths: textList(),
});
export type ExecutiveSummary = z.output<typeof executiveSummarySchema>;
