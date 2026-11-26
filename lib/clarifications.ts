import { reportStrings } from "@/lib/i18n";
import type { Report, ReportQuestion } from "@/types";

/*
 * Helpers for the clarifying-questions loop:
 * questions → answers in the report → answers appended to the document → re-check.
 */

export type AnswerMap = Record<string, string>;

/** Uses the document's own labels (e.g. "ФТ-04") so appended answers make sense to a reader of the document. */
function docRefs(report: Report, ids: string[]): string {
  const refs = ids.map((id) => report.requirements.find((r) => r.id === id)?.sourceRef ?? id);
  return refs.join(", ");
}

export function answeredQuestions(report: Report, answers: AnswerMap): ReportQuestion[] {
  return (report.clarifyingQuestions ?? []).filter((q) => answers[q.id]?.trim());
}

/** The original document plus a section with the user's answers, used for the re-check. */
export function documentWithAnswers(text: string, report: Report, answers: AnswerMap): string {
  const t = reportStrings(report.language).questions;
  const lines = [text.trimEnd(), "", `## ${t.recheckHeading}`, "", t.recheckIntro, ""];
  for (const q of answeredQuestions(report, answers)) {
    const refs = q.requirementIds.length ? ` (${docRefs(report, q.requirementIds)})` : "";
    lines.push(`${t.questionLabel} ${q.id}${refs}: ${q.question}`);
    lines.push(`${t.answerLabel}: ${answers[q.id].trim()}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function recheckFileName(report: Report): string {
  const suffix = report.language === "ru" ? " (с ответами)" : " (with answers)";
  return report.fileName.endsWith(suffix) ? report.fileName : `${report.fileName}${suffix}`;
}

/** Plain-text list of questions, ready to paste into an email or chat to the specification's author. */
export function questionsAsText(report: Report, answers: AnswerMap = {}): string {
  const t = reportStrings(report.language);
  const q = t.questions;
  const lines = [`${t.sections.questions}: ${report.document.title}`, ""];
  (report.clarifyingQuestions ?? []).forEach((item, index) => {
    const refs = item.requirementIds.length ? ` (${docRefs(report, item.requirementIds)})` : "";
    lines.push(`${index + 1}. [${t.severity[item.priority]}] ${item.question}${refs}`);
    if (item.why) lines.push(`   ${q.why}: ${item.why}`);
    lines.push(`   ${q.askWho}: ${t.audience[item.askWho]}`);
    if (item.options.length) lines.push(`   ${q.options}: ${item.options.join("; ")}`);
    if (answers[item.id]?.trim()) lines.push(`   ${q.answer}: ${answers[item.id].trim()}`);
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

/** Path of the bundled sample document, for re-checking the example reports (which don't store the text). */
export function sampleDocumentPath(reportId: string): string | null {
  if (reportId === "sample") return "/samples/spending-limit-srs.md";
  if (reportId === "sample-ru") return "/samples/spending-limit-srs-ru.md";
  return null;
}
