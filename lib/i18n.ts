import type { AgentName, Audience, Dimension, IssueCategory, Priority, ReportLanguage, RequirementType, Severity, StepMetrics, Verdict } from "@/types";

/*
 * Report vocabulary in English and Russian. The report (screen view and every
 * export) uses the language chosen for it; the app interface uses lib/ui-strings.ts.
 */

export type ReportSectionId =
  | "summary"
  | "questions"
  | "overview"
  | "findings"
  | "validation"
  | "api"
  | "security"
  | "missing"
  | "edgeCases"
  | "improvements"
  | "score";

interface ReportStrings {
  reportTitle: string;
  sections: Record<ReportSectionId, string>;
  appendixAudit: string;
  severity: Record<Severity, string>;
  verdict: Record<Verdict, string>;
  dimensions: Record<Dimension, string>;
  categories: Record<IssueCategory, string>;
  requirementTypes: Record<RequirementType, string>;
  priorities: Record<Priority, string>;
  agents: Record<AgentName, string>;
  audience: Record<Audience, string>;
  questions: {
    intro: string;
    why: string;
    askWho: string;
    options: string;
    answer: string;
    noAnswer: string;
    resolves: string;
    none: string;
    recheckHeading: string;
    recheckIntro: string;
    questionLabel: string;
    answerLabel: string;
  };
  stepStatus: Record<"done" | "skipped" | "error", string>;
  labels: {
    file: string;
    generated: string;
    models: string;
    totalRequirements: string;
    issuesFound: string;
    riskScore: string;
    qualityScore: string;
    confidence: string;
    confidenceShort: string;
    other: string;
    words: string;
    sections: string;
    endpoints: string;
    language: string;
    domain: string;
    keyRisks: string;
    strengths: string;
    requirement: string;
    type: string;
    priority: string;
    dependsOn: string;
    issues: string;
    id: string;
    severity: string;
    category: string;
    affects: string;
    evidence: string;
    standard: string;
    rationale: string;
    recommendation: string;
    suggested: string;
    scenario: string;
    expected: string;
    original: string;
    improved: string;
    why: string;
    acceptanceCriteria: string;
    duplicates: string;
    similarity: string;
    agent: string;
    status: string;
    duration: string;
    detail: string;
    noIssues: string;
    apiSkipped: string;
    documentLevel: string;
    bySeverity: string;
    byCategory: string;
    trend: string;
    outOf100: string;
    lowerIsBetter: string;
    howCalculated: string;
    scoreFormula: string;
    topContributors: string;
    noContributors: string;
    warnings: string;
    truncated: string;
  };
  /** Human-readable result of a pipeline step, or null when there is nothing to say. */
  describe: (agent: AgentName, status: "done" | "skipped" | "error", m: StepMetrics) => string | null;
  fallbackSummary: (p: { requirements: number; issues: number; critical: number; high: number; overall: number; verdict: string }) => string;
}

const en: ReportStrings = {
  reportTitle: "Requirements check report",
  sections: {
    summary: "Summary",
    questions: "Clarifying questions",
    overview: "About the document",
    findings: "Problems at a glance",
    validation: "Quality problems",
    api: "API problems",
    security: "Security problems",
    missing: "Missing requirements",
    edgeCases: "Situations not covered (edge cases)",
    improvements: "Suggested fixes",
    score: "Final score",
  },
  appendixAudit: "Appendix: how the check ran",
  severity: { critical: "Critical", high: "High", medium: "Medium", low: "Low" },
  verdict: { ready: "Ready for development", needs_revision: "Needs revision", not_ready: "Not ready" },
  dimensions: {
    completeness: "Completeness",
    clarity: "Clarity",
    testability: "Testability",
    consistency: "Consistency",
    security: "Security",
    performance: "Performance",
  },
  categories: {
    ambiguity: "Unclear wording",
    completeness: "Missing information",
    consistency: "Contradiction",
    correctness: "Incorrect statement",
    testability: "Can't be tested",
    acceptance_criteria: "Weak acceptance criteria",
    edge_case: "Edge case not covered",
    traceability: "Hard to trace",
    feasibility: "Hard to build",
    necessity: "Not needed",
    duplicate: "Duplicate",
    security: "Security gap",
    privacy: "Personal data",
    compliance: "Regulations",
    performance: "Performance",
    scalability: "Scalability",
    data_validation: "Input checks",
    api_contract: "API contract",
  },
  requirementTypes: {
    functional: "Functional",
    non_functional: "Non-functional",
    api: "API",
    data: "Data",
    security: "Security",
    performance: "Performance",
    ui: "Interface",
    business_rule: "Business rule",
    constraint: "Constraint",
    integration: "Integration",
  },
  priorities: { must: "Must", should: "Should", could: "Could", unspecified: "Not set" },
  agents: {
    extraction: "Reading the requirements",
    validation: "Checking quality",
    api: "Checking the API",
    risk: "Checking security and risks",
    clarification: "Preparing clarifying questions",
    recommendation: "Writing fixes",
    report: "Preparing the report",
  },
  audience: {
    business: "Product owner",
    tech: "Tech lead",
    security: "Security team",
    compliance: "Compliance and legal",
    design: "UX designer",
  },
  questions: {
    intro: "Questions to ask the author of the specification before development starts, most important first.",
    why: "Why it matters",
    askWho: "Who should answer",
    options: "Possible answers",
    answer: "Answer",
    noAnswer: "Not answered yet",
    resolves: "Resolves",
    none: "No open questions: the specification is clear enough to start.",
    recheckHeading: "Clarifications (answers to ReqWise questions)",
    recheckIntro: "The following answers clarify the requirements above and take precedence over them where they differ.",
    questionLabel: "Question",
    answerLabel: "Answer",
  },
  stepStatus: { done: "Done", skipped: "Skipped", error: "Failed" },
  labels: {
    file: "File",
    generated: "Created",
    models: "AI model",
    totalRequirements: "Requirements",
    issuesFound: "Problems found",
    riskScore: "Risk level",
    qualityScore: "Quality score",
    confidence: "AI confidence",
    confidenceShort: "confidence",
    other: "Other",
    words: "Words",
    sections: "Sections",
    endpoints: "API endpoints",
    language: "Language",
    domain: "Area",
    keyRisks: "Main risks",
    strengths: "What is done well",
    requirement: "Requirement",
    type: "Type",
    priority: "Priority",
    dependsOn: "Depends on",
    issues: "Problems",
    id: "ID",
    severity: "Severity",
    category: "Type",
    affects: "Affects",
    evidence: "Quote from the document",
    standard: "Rule broken",
    rationale: "Why this is a problem",
    recommendation: "How to fix",
    suggested: "Suggested requirement",
    scenario: "Situation",
    expected: "What should happen",
    original: "Original",
    improved: "Suggested",
    why: "What changed",
    acceptanceCriteria: "How to test it",
    duplicates: "Possible duplicates",
    similarity: "Similarity",
    agent: "Step",
    status: "Status",
    duration: "Time",
    detail: "Result",
    noIssues: "No problems found here.",
    apiSkipped: "The document describes no API, so this check was skipped.",
    documentLevel: "Whole document",
    bySeverity: "Problems by severity",
    byCategory: "Problems by type",
    trend: "Your quality scores over time",
    outOf100: "out of 100",
    lowerIsBetter: "lower is better",
    howCalculated: "How the score is calculated",
    scoreFormula:
      "Each problem takes points away from the areas it affects. Serious problems take more: critical 20, high 12, medium 6, low 2, multiplied by how confident the AI is. An area's score is 100 × e^(−points ÷ K), where K = 45 + 1.5 × the number of requirements, so long documents aren't punished for their size. The final score is a weighted average: completeness, clarity and testability 20% each, consistency and security 15% each, performance 10%. The AI finds the problems; the score is calculated by these fixed rules, so the same problems always give the same score.",
    topContributors: "Biggest deductions",
    noContributors: "No deductions",
    warnings: "Note",
    truncated: "The document was longer than the check limit, so only the first part was checked.",
  },
  describe: (agent, status, m) => {
    if (status === "skipped") return agent === "api" ? "Skipped: the document has no API" : agent === "recommendation" ? "Skipped: nothing to fix" : null;
    if (status !== "done") return null;
    switch (agent) {
      case "extraction":
        return m.requirements === undefined ? null : `Found ${m.requirements} requirements and ${m.endpoints ?? 0} API endpoints`;
      case "validation":
        return m.issues === undefined ? null : `${m.issues} problems, ${m.missing ?? 0} missing requirements, ${m.edgeCases ?? 0} edge cases`;
      case "api":
        return m.issues === undefined ? null : `${m.issues} API problems`;
      case "risk":
        return m.issues === undefined ? null : `${m.issues} risks, ${m.missing ?? 0} missing safeguards`;
      case "clarification":
        return m.questions === undefined ? null : `${m.questions} clarifying questions`;
      case "recommendation":
        return m.rewritten === undefined ? null : `${m.rewritten} requirements rewritten`;
      case "report":
        return m.overall === undefined ? null : `Quality ${m.overall}/100, risk ${m.risk ?? 0}/100`;
    }
  },
  fallbackSummary: (p) =>
    `The document contains ${p.requirements} requirements. ReqWise found ${p.issues} problems, including ${p.critical} critical and ${p.high} high severity. The quality score is ${p.overall}/100: ${p.verdict.toLowerCase()}.`,
};

const ru: ReportStrings = {
  reportTitle: "Отчёт о проверке требований",
  sections: {
    summary: "Краткий итог",
    questions: "Уточняющие вопросы",
    overview: "О документе",
    findings: "Обзор проблем",
    validation: "Проблемы качества",
    api: "Проблемы API",
    security: "Проблемы безопасности",
    missing: "Недостающие требования",
    edgeCases: "Неучтённые ситуации (граничные случаи)",
    improvements: "Предлагаемые исправления",
    score: "Итоговая оценка",
  },
  appendixAudit: "Приложение: ход проверки",
  severity: { critical: "Критическая", high: "Высокая", medium: "Средняя", low: "Низкая" },
  verdict: { ready: "Готово к разработке", needs_revision: "Требует доработки", not_ready: "Не готово" },
  dimensions: {
    completeness: "Полнота",
    clarity: "Ясность",
    testability: "Проверяемость",
    consistency: "Согласованность",
    security: "Безопасность",
    performance: "Производительность",
  },
  categories: {
    ambiguity: "Неясная формулировка",
    completeness: "Не хватает информации",
    consistency: "Противоречие",
    correctness: "Неверное утверждение",
    testability: "Нельзя проверить",
    acceptance_criteria: "Слабые критерии приёмки",
    edge_case: "Неучтённый граничный случай",
    traceability: "Сложно отследить",
    feasibility: "Сложно реализовать",
    necessity: "Лишнее требование",
    duplicate: "Дубликат",
    security: "Пробел в безопасности",
    privacy: "Персональные данные",
    compliance: "Нормативные требования",
    performance: "Производительность",
    scalability: "Масштабируемость",
    data_validation: "Проверка ввода",
    api_contract: "Контракт API",
  },
  requirementTypes: {
    functional: "Функциональное",
    non_functional: "Нефункциональное",
    api: "API",
    data: "Данные",
    security: "Безопасность",
    performance: "Производительность",
    ui: "Интерфейс",
    business_rule: "Бизнес-правило",
    constraint: "Ограничение",
    integration: "Интеграция",
  },
  priorities: { must: "Обязательно", should: "Желательно", could: "Возможно", unspecified: "Не указан" },
  agents: {
    extraction: "Читаем требования",
    validation: "Проверяем качество",
    api: "Проверяем API",
    risk: "Проверяем безопасность и риски",
    clarification: "Готовим уточняющие вопросы",
    recommendation: "Готовим исправления",
    report: "Собираем отчёт",
  },
  audience: {
    business: "Владелец продукта",
    tech: "Технический лидер",
    security: "Служба безопасности",
    compliance: "Комплаенс и юристы",
    design: "UX-дизайнер",
  },
  questions: {
    intro: "Вопросы автору технического задания, на которые нужно ответить до начала разработки. Самые важные — первыми.",
    why: "Почему это важно",
    askWho: "Кто должен ответить",
    options: "Возможные ответы",
    answer: "Ответ",
    noAnswer: "Ответа пока нет",
    resolves: "Закрывает",
    none: "Открытых вопросов нет: ТЗ достаточно понятно, чтобы начинать.",
    recheckHeading: "Уточнения (ответы на вопросы ReqWise)",
    recheckIntro: "Ниже приведены ответы, уточняющие требования выше. При расхождении действуют эти ответы.",
    questionLabel: "Вопрос",
    answerLabel: "Ответ",
  },
  stepStatus: { done: "Готово", skipped: "Пропущено", error: "Ошибка" },
  labels: {
    file: "Файл",
    generated: "Создан",
    models: "Модель ИИ",
    totalRequirements: "Требований",
    issuesFound: "Найдено проблем",
    riskScore: "Уровень риска",
    qualityScore: "Оценка качества",
    confidence: "Уверенность ИИ",
    confidenceShort: "уверенность",
    other: "Другое",
    words: "Слов",
    sections: "Разделов",
    endpoints: "Эндпоинтов API",
    language: "Язык",
    domain: "Область",
    keyRisks: "Главные риски",
    strengths: "Что сделано хорошо",
    requirement: "Требование",
    type: "Тип",
    priority: "Приоритет",
    dependsOn: "Зависит от",
    issues: "Проблем",
    id: "ID",
    severity: "Критичность",
    category: "Тип",
    affects: "Затрагивает",
    evidence: "Цитата из документа",
    standard: "Нарушенное правило",
    rationale: "Почему это проблема",
    recommendation: "Как исправить",
    suggested: "Предлагаемое требование",
    scenario: "Ситуация",
    expected: "Что должно происходить",
    original: "Было",
    improved: "Предлагается",
    why: "Что изменено",
    acceptanceCriteria: "Как проверить",
    duplicates: "Возможные дубликаты",
    similarity: "Сходство",
    agent: "Шаг",
    status: "Статус",
    duration: "Время",
    detail: "Результат",
    noIssues: "Здесь проблем не найдено.",
    apiSkipped: "В документе нет описания API, поэтому эта проверка пропущена.",
    documentLevel: "Весь документ",
    bySeverity: "Проблемы по критичности",
    byCategory: "Проблемы по типам",
    trend: "Ваши оценки качества со временем",
    outOf100: "из 100",
    lowerIsBetter: "чем ниже, тем лучше",
    howCalculated: "Как рассчитывается оценка",
    scoreFormula:
      "Каждая проблема снимает баллы с тех областей, которые затрагивает. Серьёзные проблемы снимают больше: критическая 20, высокая 12, средняя 6, низкая 2, с учётом уверенности ИИ. Оценка области равна 100 × e^(−баллы ÷ K), где K = 45 + 1,5 × число требований, поэтому длинные документы не наказываются за объём. Итоговая оценка — взвешенное среднее: полнота, ясность и проверяемость по 20%, согласованность и безопасность по 15%, производительность 10%. ИИ находит проблемы, а оценка считается по этим фиксированным правилам, поэтому одинаковые проблемы всегда дают одинаковую оценку.",
    topContributors: "Наибольшие снижения",
    noContributors: "Снижений нет",
    warnings: "Примечание",
    truncated: "Документ превысил лимит проверки, поэтому проверена только первая часть.",
  },
  describe: (agent, status, m) => {
    if (status === "skipped") return agent === "api" ? "Пропущено: в документе нет API" : agent === "recommendation" ? "Пропущено: исправлять нечего" : null;
    if (status !== "done") return null;
    switch (agent) {
      case "extraction":
        return m.requirements === undefined ? null : `Найдено требований: ${m.requirements}, эндпоинтов API: ${m.endpoints ?? 0}`;
      case "validation":
        return m.issues === undefined ? null : `Проблем: ${m.issues}, недостающих требований: ${m.missing ?? 0}, граничных случаев: ${m.edgeCases ?? 0}`;
      case "api":
        return m.issues === undefined ? null : `Проблем API: ${m.issues}`;
      case "risk":
        return m.issues === undefined ? null : `Рисков: ${m.issues}, недостающих мер защиты: ${m.missing ?? 0}`;
      case "clarification":
        return m.questions === undefined ? null : `Уточняющих вопросов: ${m.questions}`;
      case "recommendation":
        return m.rewritten === undefined ? null : `Переписано требований: ${m.rewritten}`;
      case "report":
        return m.overall === undefined ? null : `Качество ${m.overall}/100, риск ${m.risk ?? 0}/100`;
    }
  },
  fallbackSummary: (p) =>
    `Документ содержит ${p.requirements} требований. ReqWise нашёл ${p.issues} проблем, из них критических — ${p.critical}, высокой критичности — ${p.high}. Оценка качества — ${p.overall}/100: ${p.verdict.toLowerCase()}.`,
};

export const REPORT_STRINGS: Record<ReportLanguage, ReportStrings> = { en, ru };

export function reportStrings(language: ReportLanguage): ReportStrings {
  return REPORT_STRINGS[language] ?? en;
}

export const REPORT_SECTION_ORDER: ReportSectionId[] = [
  "summary",
  "questions",
  "overview",
  "findings",
  "validation",
  "api",
  "security",
  "missing",
  "edgeCases",
  "improvements",
  "score",
];
