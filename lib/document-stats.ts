import type { DocumentStats } from "@/types";

/*
 * Fast, local document statistics shown before any AI call.
 * The requirement count is a heuristic estimate; the extraction agent produces the real list.
 * Works in the browser and on the server.
 */

const LABELLED_REQUIREMENT = /^\s*[-*•]?\s*(?:REQ|FR|NFR|BR|SR|UR|US|TR|UI|LOG|API|ФТ|НФТ|ТР)[-_.\s]?\d+/iu;
/** Any short upper-case label with a dash and a number, e.g. "БТ-01.", "ОГР-2", "SEC-10:". */
const GENERIC_LABEL = /^\s*[-*•]?\s*\p{Lu}{1,6}[-_]\d{1,3}(?=[.):\s]|$)/u;
const MODAL_VERB =
  /(?<![\p{L}\p{N}_])(shall|must|should|is required to|required to|has to|должн\p{L}*|обязан\p{L}*|необходимо|следует|требуется)(?![\p{L}\p{N}_])/iu;
const USER_STORY = /(?<!\p{L})as an? [^,]{2,60},? i (?:want|need)|(?<!\p{L})как [^,]{2,60},? я хочу/iu;
const MARKDOWN_HEADING = /^\s{0,3}#{1,6}\s+\S/;
const NUMBERED_HEADING = /^\s*\d{1,2}(?:\.\d{1,2}){0,3}\.?\s+\p{Lu}/u;
const ENDPOINT = /\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[^\s`'")\],;]*)/g;

export function computeDocumentStats(text: string): DocumentStats {
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
  const lines = text.split(/\r?\n/);

  // A labelled line ("FR-3. ...") counts once; other lines are split into sentences.
  let requirements = 0;
  for (const line of lines) {
    if (LABELLED_REQUIREMENT.test(line) || GENERIC_LABEL.test(line)) {
      requirements += 1;
      continue;
    }
    requirements += line
      .split(/(?<=[.!?;])\s+(?=\p{Lu}|[-*•\d])/u)
      .filter((s) => s.trim().length > 12 && (MODAL_VERB.test(s) || USER_STORY.test(s))).length;
  }

  const sections = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 90) return false;
    if (MARKDOWN_HEADING.test(line)) return true;
    return NUMBERED_HEADING.test(line) && !MODAL_VERB.test(line) && !/[.;:]$/.test(trimmed);
  }).length;

  const endpoints = new Set<string>();
  for (const match of text.matchAll(ENDPOINT)) endpoints.add(`${match[1]} ${match[2]}`);

  return {
    words,
    characters: text.length,
    requirements,
    sections,
    apiEndpoints: endpoints.size,
    language: detectLanguage(text),
  };
}

export function detectLanguage(text: string): DocumentStats["language"] {
  const sample = text.slice(0, 20_000);
  const cyrillic = sample.match(/\p{Script=Cyrillic}/gu)?.length ?? 0;
  const latin = sample.match(/[A-Za-z]/g)?.length ?? 0;
  const total = cyrillic + latin;
  if (total < 20) return "unknown";
  const share = cyrillic / total;
  if (share > 0.6) return "ru";
  if (share < 0.15) return "en";
  return "mixed";
}

/** Normalises whitespace from PDF and DOCX extraction without destroying paragraph breaks. */
export function normaliseDocumentText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
