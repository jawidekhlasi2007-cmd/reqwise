import type { Report, Verdict } from "@/types";

/*
 * Report history in the browser's localStorage. Every access is wrapped in
 * try/catch: storage can be full, disabled or unavailable (private mode).
 */

const INDEX_KEY = "arv:reports:v1";
const REPORT_KEY = (id: string) => `arv:report:v1:${id}`;
const CHANGE_EVENT = "arv:reports-changed";
export const MAX_STORED_REPORTS = 12;

/** Reports from this browser session, so a just-finished report opens even if storage is full. */
const memoryCache = new Map<string, Report>();

export interface ReportSummary {
  id: string;
  fileName: string;
  title: string;
  createdAt: string;
  overall: number;
  issues: number;
  requirements: number;
  verdict: Verdict;
  language: Report["language"];
}

function summarise(report: Report): ReportSummary {
  return {
    id: report.id,
    fileName: report.fileName,
    title: report.document.title,
    createdAt: report.createdAt,
    overall: report.scores.overall,
    issues: report.findings.length,
    requirements: report.requirements.length,
    verdict: report.scores.verdict,
    language: report.language,
  };
}

export function listReports(): ReportSummary[] {
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ReportSummary[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(index: ReportSummary[]) {
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Saves a report, evicting the oldest ones when storage is full. Returns false if it could not be saved. */
export function saveReport(report: Report): boolean {
  memoryCache.set(report.id, report);
  let index = listReports().filter((r) => r.id !== report.id);
  index.unshift(summarise(report));

  while (index.length > MAX_STORED_REPORTS) {
    const removed = index.pop();
    if (removed) safeRemove(REPORT_KEY(removed.id));
  }

  for (let attempt = 0; attempt < MAX_STORED_REPORTS; attempt += 1) {
    try {
      window.localStorage.setItem(REPORT_KEY(report.id), JSON.stringify(report));
      writeIndex(index);
      return true;
    } catch {
      const oldest = index.length > 1 ? index.pop() : undefined;
      if (!oldest) return false;
      safeRemove(REPORT_KEY(oldest.id));
      index = index.filter((r) => r.id !== oldest.id);
    }
  }
  return false;
}

export function getReport(id: string): Report | null {
  const cached = memoryCache.get(id);
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(REPORT_KEY(id));
    if (!raw) return null;
    const report = JSON.parse(raw) as Report;
    return report && report.version === 1 ? report : null;
  } catch {
    return null;
  }
}

export function deleteReport(id: string): void {
  memoryCache.delete(id);
  safeRemove(REPORT_KEY(id));
  safeRemove(ANSWERS_KEY(id));
  try {
    writeIndex(listReports().filter((r) => r.id !== id));
  } catch {
    // Storage unavailable; nothing else to clean up.
  }
}

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function subscribeToReports(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith("arv:")) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/* ---------- Answers to clarifying questions (per report) ---------- */

const ANSWERS_KEY = (id: string) => `arv:answers:v1:${id}`;
export type Answers = Record<string, string>;

export function getAnswers(reportId: string): Answers {
  try {
    const raw = window.localStorage.getItem(ANSWERS_KEY(reportId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as Answers) : {};
  } catch {
    return {};
  }
}

export function saveAnswers(reportId: string, answers: Answers): void {
  try {
    const cleaned = Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim()));
    if (Object.keys(cleaned).length) window.localStorage.setItem(ANSWERS_KEY(reportId), JSON.stringify(cleaned));
    else window.localStorage.removeItem(ANSWERS_KEY(reportId));
  } catch {
    // Storage full or unavailable: answers stay in memory for this visit.
  }
}

/* ---------- Hand-off from a report to the check page for a re-check ---------- */

const RECHECK_KEY = "arv:recheck:v1";

export interface RecheckRequest {
  fileName: string;
  text: string;
  language: Report["language"];
}

export function setRecheck(request: RecheckRequest): void {
  try {
    window.sessionStorage.setItem(RECHECK_KEY, JSON.stringify(request));
  } catch {
    // ignore
  }
}

/** Returns and removes a pending re-check request, if any. */
export function takeRecheck(): RecheckRequest | null {
  try {
    const raw = window.sessionStorage.getItem(RECHECK_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(RECHECK_KEY);
    const parsed = JSON.parse(raw) as RecheckRequest;
    return parsed && typeof parsed.text === "string" ? parsed : null;
  } catch {
    return null;
  }
}
