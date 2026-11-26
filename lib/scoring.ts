import type { Dimension, EdgeCase, IssueCategory, MissingRequirement, ReportFinding, Scores, Severity, Verdict } from "@/types";

/*
 * Deterministic, explainable scoring. The model finds issues; this code turns
 * them into scores, so the same findings always produce the same numbers.
 *
 *   penalty(issue)   = severityWeight × confidence × dimensionShare
 *   dimensionScore   = 100 × e^(−Σ penalties / K),  K = 45 + 1.5 × requirementCount
 *   overall          = weighted mean of the six dimensions
 *   risk             = 100 × (1 − e^(−riskPoints / 60))
 *
 * K grows with document size so a long specification is not punished just for
 * having more requirements to find issues in.
 */

export const DIMENSIONS: Dimension[] = ["completeness", "clarity", "testability", "consistency", "security", "performance"];

export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  completeness: 0.2,
  clarity: 0.2,
  testability: 0.2,
  consistency: 0.15,
  security: 0.15,
  performance: 0.1,
};

export const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 20, high: 12, medium: 6, low: 2 };
export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export const CATEGORY_DIMENSIONS: Record<IssueCategory, Partial<Record<Dimension, number>>> = {
  ambiguity: { clarity: 1 },
  completeness: { completeness: 1 },
  consistency: { consistency: 1 },
  correctness: { consistency: 0.5, completeness: 0.5 },
  testability: { testability: 1 },
  acceptance_criteria: { testability: 1 },
  edge_case: { completeness: 0.5, testability: 0.5 },
  traceability: { consistency: 0.5, clarity: 0.5 },
  feasibility: { completeness: 0.5, performance: 0.5 },
  necessity: { clarity: 1 },
  duplicate: { consistency: 0.5, clarity: 0.5 },
  security: { security: 1 },
  privacy: { security: 1 },
  compliance: { security: 0.5, completeness: 0.5 },
  performance: { performance: 1 },
  scalability: { performance: 1 },
  data_validation: { completeness: 0.5, security: 0.5 },
  api_contract: { consistency: 0.5, completeness: 0.5 },
};

const RISK_CATEGORIES = new Set<IssueCategory>(["security", "privacy", "compliance", "scalability", "performance", "data_validation"]);
const MISSING_FACTOR = 0.8;
const EDGE_CASE_FACTOR = 0.4;

export interface PenaltyItem {
  kind: "finding" | "missing" | "edge_case";
  ref: string;
  title: string;
  severity: Severity;
  dimension: Dimension;
  points: number;
}

export interface ScoringInput {
  findings: ReportFinding[];
  missingRequirements: MissingRequirement[];
  edgeCases: EdgeCase[];
  requirementCount: number;
}

export function collectPenalties({ findings, missingRequirements, edgeCases }: ScoringInput): PenaltyItem[] {
  const items: PenaltyItem[] = [];

  for (const f of findings) {
    for (const [dimension, share] of Object.entries(CATEGORY_DIMENSIONS[f.category]) as [Dimension, number][]) {
      items.push({ kind: "finding", ref: f.id, title: f.title, severity: f.severity, dimension, points: SEVERITY_WEIGHT[f.severity] * f.confidence * share });
    }
  }
  missingRequirements.forEach((m, i) => {
    for (const [dimension, share] of Object.entries(CATEGORY_DIMENSIONS[m.category]) as [Dimension, number][]) {
      items.push({ kind: "missing", ref: `M-${i + 1}`, title: m.title, severity: m.severity, dimension, points: SEVERITY_WEIGHT[m.severity] * MISSING_FACTOR * share });
    }
  });
  edgeCases.forEach((e, i) => {
    for (const dimension of ["completeness", "testability"] as const) {
      items.push({ kind: "edge_case", ref: `E-${i + 1}`, title: e.scenario, severity: e.severity, dimension, points: SEVERITY_WEIGHT[e.severity] * EDGE_CASE_FACTOR * 0.5 });
    }
  });
  return items;
}

export function scoringScale(requirementCount: number): number {
  return 45 + 1.5 * Math.max(1, requirementCount);
}

export function computeScores(input: ScoringInput): Scores {
  const penalties = collectPenalties(input);
  const k = scoringScale(input.requirementCount);

  const dimensions = Object.fromEntries(
    DIMENSIONS.map((d) => {
      const points = penalties.filter((p) => p.dimension === d).reduce((sum, p) => sum + p.points, 0);
      return [d, Math.round(100 * Math.exp(-points / k))];
    }),
  ) as Record<Dimension, number>;

  const overall = Math.round(DIMENSIONS.reduce((sum, d) => sum + dimensions[d] * DIMENSION_WEIGHTS[d], 0));

  const riskPoints =
    input.findings.reduce((sum, f) => {
      const base = RISK_CATEGORIES.has(f.category) ? SEVERITY_WEIGHT[f.severity] * f.confidence : 0;
      return sum + base + (f.severity === "critical" ? 5 : 0);
    }, 0) +
    input.missingRequirements.reduce((sum, m) => sum + (RISK_CATEGORIES.has(m.category) ? SEVERITY_WEIGHT[m.severity] * MISSING_FACTOR : 0), 0);
  const risk = Math.round(100 * (1 - Math.exp(-riskPoints / 60)));

  const hasCritical = input.findings.some((f) => f.severity === "critical");
  const verdict: Verdict = overall >= 80 && !hasCritical ? "ready" : overall >= 55 ? "needs_revision" : "not_ready";

  const weightSum = input.findings.reduce((s, f) => s + SEVERITY_WEIGHT[f.severity], 0);
  const confidence = weightSum
    ? Math.round((input.findings.reduce((s, f) => s + f.confidence * SEVERITY_WEIGHT[f.severity], 0) / weightSum) * 100) / 100
    : 0;

  return { overall, risk, dimensions, verdict, confidence };
}

/** The biggest contributors to each dimension's penalty, for the "How is this calculated?" view. */
export function explainDimensions(input: ScoringInput, top = 3): Record<Dimension, PenaltyItem[]> {
  const penalties = collectPenalties(input);
  return Object.fromEntries(
    DIMENSIONS.map((d) => [
      d,
      penalties
        .filter((p) => p.dimension === d)
        .sort((a, b) => b.points - a.points)
        .slice(0, top),
    ]),
  ) as Record<Dimension, PenaltyItem[]>;
}

export function severityRank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}
