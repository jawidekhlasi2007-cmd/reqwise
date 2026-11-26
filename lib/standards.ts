/*
 * The reference clauses agents are allowed to cite. Giving the model a closed
 * list keeps citations accurate instead of letting it invent clause numbers.
 * The landing page renders the same data.
 */

export interface StandardClause {
  ref: string;
  name: string;
  meaning: string;
}

export interface StandardGroup {
  id: "iso29148" | "ieee830" | "owaspApi" | "http";
  title: string;
  summary: string;
  clauses: StandardClause[];
}

export const STANDARDS: StandardGroup[] = [
  {
    id: "iso29148",
    title: "ISO/IEC/IEEE 29148:2018",
    summary: "Requirements engineering: what makes an individual requirement, and a set of requirements, well formed.",
    clauses: [
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.5 Necessary", name: "Necessary", meaning: "Removing it would leave a real gap; no gold-plating." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.5 Appropriate", name: "Appropriate", meaning: "Stated at the right level of detail, free of needless design decisions." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.5 Unambiguous", name: "Unambiguous", meaning: "Only one possible interpretation." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.5 Complete", name: "Complete", meaning: "Nothing else is needed to understand or implement it." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.5 Singular", name: "Singular", meaning: "States one capability, condition or constraint." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.5 Feasible", name: "Feasible", meaning: "Achievable within known constraints." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.5 Verifiable", name: "Verifiable", meaning: "Its fulfilment can be proven by test, demonstration, inspection or analysis." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.5 Correct", name: "Correct", meaning: "An accurate representation of the stakeholder need." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.6 Consistent (set)", name: "Consistent set", meaning: "No requirement conflicts with another; terms are used the same way." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.6 Complete (set)", name: "Complete set", meaning: "The set covers all needed capabilities, conditions and constraints." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.7 Requirement language", name: "Language criteria", meaning: "Avoid vague terms, superlatives, comparatives, loopholes and open-ended phrases." },
      { ref: "ISO/IEC/IEEE 29148:2018 §5.2.8 Requirement attributes", name: "Attributes", meaning: "Each requirement carries an ID, priority, rationale and source for traceability." },
    ],
  },
  {
    id: "ieee830",
    title: "IEEE 830-1998",
    summary: "Recommended practice for software requirements specifications: the qualities of a good SRS.",
    clauses: [
      { ref: "IEEE 830-1998 §4.3.1 Correct", name: "Correct", meaning: "Every requirement is one the software shall meet." },
      { ref: "IEEE 830-1998 §4.3.2 Unambiguous", name: "Unambiguous", meaning: "Every requirement has only one interpretation." },
      { ref: "IEEE 830-1998 §4.3.3 Complete", name: "Complete", meaning: "Responses to all inputs, valid and invalid, are defined." },
      { ref: "IEEE 830-1998 §4.3.4 Consistent", name: "Consistent", meaning: "No subset of requirements conflicts." },
      { ref: "IEEE 830-1998 §4.3.5 Ranked", name: "Ranked", meaning: "Requirements are ranked for importance and stability." },
      { ref: "IEEE 830-1998 §4.3.6 Verifiable", name: "Verifiable", meaning: "A finite, cost-effective process can check each requirement." },
      { ref: "IEEE 830-1998 §4.3.7 Modifiable", name: "Modifiable", meaning: "Structured so changes are easy and do not duplicate content." },
      { ref: "IEEE 830-1998 §4.3.8 Traceable", name: "Traceable", meaning: "The origin of each requirement is clear and it can be referenced." },
    ],
  },
  {
    id: "owaspApi",
    title: "OWASP API Security Top 10 (2023)",
    summary: "Most common API security risks, used by the API and risk agents.",
    clauses: [
      { ref: "OWASP API1:2023 Broken Object Level Authorization", name: "Object-level authorization", meaning: "Callers must only reach objects they own." },
      { ref: "OWASP API2:2023 Broken Authentication", name: "Authentication", meaning: "Every endpoint states how callers prove identity." },
      { ref: "OWASP API3:2023 Broken Object Property Level Authorization", name: "Property-level authorization", meaning: "Responses expose only the fields the caller may see." },
      { ref: "OWASP API4:2023 Unrestricted Resource Consumption", name: "Resource limits", meaning: "Rate limits, payload limits and pagination are defined." },
      { ref: "OWASP API5:2023 Broken Function Level Authorization", name: "Function-level authorization", meaning: "Internal and admin operations are not callable by customers." },
      { ref: "OWASP API6:2023 Unrestricted Access to Sensitive Business Flows", name: "Sensitive flows", meaning: "Business flows are protected against automated abuse." },
      { ref: "OWASP API8:2023 Security Misconfiguration", name: "Misconfiguration", meaning: "Transport security, headers and error details are specified." },
    ],
  },
  {
    id: "http",
    title: "RFC 9110 HTTP Semantics",
    summary: "Status codes and method semantics the API agent checks contracts against.",
    clauses: [
      { ref: "RFC 9110 §15 Status Codes", name: "Status codes", meaning: "Errors use 4xx/5xx codes, not 200 with an error body." },
      { ref: "RFC 9110 §9.2.2 Idempotent Methods", name: "Idempotency", meaning: "Retried requests must not duplicate side effects." },
    ],
  },
];

/** Compact list injected into prompts so models cite real clauses only. */
export function standardsForPrompt(groups: StandardGroup["id"][]): string {
  return STANDARDS.filter((g) => groups.includes(g.id))
    .flatMap((g) => g.clauses.map((c) => `- "${c.ref}": ${c.meaning}`))
    .join("\n");
}
