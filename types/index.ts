import type {
  ApiEndpoint,
  Audience,
  ClarifyingQuestion,
  EdgeCase,
  ExecutiveSummary,
  Finding,
  Improvement,
  IssueCategory,
  MissingRequirement,
  Priority,
  ReportLanguage,
  Requirement,
  RequirementType,
  Severity,
} from "@/lib/schemas";

export type {
  ApiEndpoint,
  Audience,
  ClarifyingQuestion,
  EdgeCase,
  ExecutiveSummary,
  Finding,
  Improvement,
  IssueCategory,
  MissingRequirement,
  Priority,
  ReportLanguage,
  Requirement,
  RequirementType,
  Severity,
};

export type AgentName = "extraction" | "validation" | "api" | "risk" | "clarification" | "recommendation" | "report";

/** Agents whose findings appear in the report. */
export type FindingSource = "validation" | "api" | "risk";

export type Dimension = "completeness" | "clarity" | "testability" | "consistency" | "security" | "performance";

export type Verdict = "ready" | "needs_revision" | "not_ready";

export interface DocumentStats {
  words: number;
  characters: number;
  /** Heuristic count of requirement-like statements, before AI extraction. */
  requirements: number;
  sections: number;
  apiEndpoints: number;
  language: "en" | "ru" | "mixed" | "unknown";
}

export interface ReportFinding extends Finding {
  id: string;
  source: FindingSource;
}

export interface ReportQuestion extends ClarifyingQuestion {
  id: string;
}

export interface DuplicatePair {
  a: string;
  b: string;
  similarity: number;
}

export interface Scores {
  overall: number;
  /** 0-100, higher means riskier. */
  risk: number;
  dimensions: Record<Dimension, number>;
  verdict: Verdict;
  /** Severity-weighted mean confidence of the findings, 0-1. */
  confidence: number;
}

/** Counts produced by a pipeline step; the UI turns them into sentences in the right language. */
export type StepMetrics = Partial<
  Record<"requirements" | "endpoints" | "issues" | "missing" | "edgeCases" | "rewritten" | "questions" | "overall" | "risk", number>
>;

export interface AuditEntry {
  agent: AgentName;
  status: "done" | "skipped" | "error";
  startedAt: string;
  durationMs: number;
  model?: string;
  /** English description, kept for logs and older reports. */
  detail: string;
  metrics?: StepMetrics;
  outputChars?: number;
}

export interface Report {
  version: 1;
  id: string;
  createdAt: string;
  fileName: string;
  language: ReportLanguage;
  models: string[];
  document: {
    title: string;
    domain: string;
    summary: string;
    stats: DocumentStats;
    truncated: boolean;
    /** The analysed text, kept so the user can re-check it with answers to the clarifying questions. */
    text?: string;
  };
  requirements: Requirement[];
  endpoints: ApiEndpoint[];
  findings: ReportFinding[];
  missingRequirements: MissingRequirement[];
  edgeCases: EdgeCase[];
  improvements: Improvement[];
  /** Questions for the specification's author. Missing in reports created before this feature. */
  clarifyingQuestions?: ReportQuestion[];
  duplicates: DuplicatePair[];
  executiveSummary: ExecutiveSummary;
  scores: Scores;
  audit: AuditEntry[];
  warnings: string[];
}

export type StepStatus = "pending" | "running" | "done" | "skipped" | "error";

/** Events streamed from /api/analyze as newline-delimited JSON. */
export type PipelineEvent =
  | {
      type: "agent";
      agent: AgentName;
      status: Exclude<StepStatus, "pending">;
      detail?: string;
      /** Error code when status is "error", so the interface can show a translated message. */
      code?: string;
      metrics?: StepMetrics;
      model?: string;
      durationMs?: number;
    }
  | { type: "progress"; agent: AgentName; chars: number }
  | { type: "result"; report: Report }
  | { type: "error"; message: string; code?: string };
