"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RotateCcw, UserRound } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { documentWithAnswers, questionsAsText, recheckFileName, sampleDocumentPath, type AnswerMap } from "@/lib/clarifications";
import { reportStrings } from "@/lib/i18n";
import { getAnswers, saveAnswers, setRecheck } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Report } from "@/types";
import { SeverityBadge } from "./severity";

/** The agent's clarifying questions, with answer fields and the re-check loop. */
export function ClarifyingQuestions({ report }: { report: Report }) {
  const router = useRouter();
  const { t: ui } = useUi();
  const t = reportStrings(report.language);
  const q = t.questions;
  const questions = report.clarifyingQuestions ?? [];
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setAnswers(getAnswers(report.id)), [report.id]);

  const update = (id: string, value: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      saveAnswers(report.id, next);
      return next;
    });
  };

  const answeredCount = questions.filter((item) => answers[item.id]?.trim()).length;
  const canRecheck = Boolean(report.document.text || sampleDocumentPath(report.id));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(questionsAsText(report, answers));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const recheck = async () => {
    setBusy(true);
    setError(null);
    try {
      let text = report.document.text;
      if (!text) {
        const path = sampleDocumentPath(report.id);
        if (!path) throw new Error("no text");
        const response = await fetch(path);
        if (!response.ok) throw new Error("sample");
        text = await response.text();
      }
      setRecheck({ fileName: recheckFileName(report), text: documentWithAnswers(text, report, answers), language: report.language });
      router.push("/dashboard");
    } catch {
      setError(ui.report.recheckUnavailable);
      setBusy(false);
    }
  };

  if (!questions.length) return <p className="text-sm text-fg-muted">{q.none}</p>;

  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="max-w-3xl text-fg-muted">{q.intro}</p>

      <ol className="grid grid-cols-1 gap-3">
        {questions.map((item) => {
          const answer = answers[item.id] ?? "";
          return (
            <li key={item.id} className="keep-together rounded-xl border border-line bg-ink/30 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-fg-muted">{item.id}</span>
                <SeverityBadge severity={item.priority} label={t.severity[item.priority]} />
                <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 text-xs text-fg-muted">
                  <UserRound aria-hidden className="size-3.5" />
                  <span className="sr-only">{q.askWho}: </span>
                  {t.audience[item.askWho]}
                </span>
                {answer.trim() ? (
                  <span className="no-print ml-auto inline-flex items-center gap-1 text-xs text-success">
                    <Check aria-hidden className="size-3.5" />
                    {q.answer}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-[1.02rem] font-medium leading-snug text-fg">{item.question}</p>
              {item.why ? (
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  <span className="text-fg-subtle">{q.why}: </span>
                  {item.why}
                </p>
              ) : null}
              {item.requirementIds.length || item.findingIds.length ? (
                <p className="mt-1.5 text-sm text-fg-subtle">
                  {item.requirementIds.length ? (
                    <>
                      {t.labels.affects}: <span className="tabular-nums text-fg-muted">{item.requirementIds.join(", ")}</span>
                    </>
                  ) : null}
                  {item.requirementIds.length && item.findingIds.length ? <span className="mx-2">|</span> : null}
                  {item.findingIds.length ? (
                    <>
                      {q.resolves}: <span className="tabular-nums text-fg-muted">{item.findingIds.join(", ")}</span>
                    </>
                  ) : null}
                </p>
              ) : null}

              {item.options.length ? (
                <div className="mt-3" role="group" aria-label={q.options}>
                  <p className="mb-1.5 text-xs text-fg-subtle">{q.options}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.options.map((option) => {
                      const selected = answer.trim() === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => update(item.id, selected ? "" : option)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-left text-sm transition-colors",
                            selected ? "border-primary bg-primary/15 text-fg" : "border-line-strong text-fg-muted hover:bg-white/[0.05] hover:text-fg",
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <label className="no-print mt-3 block">
                <span className="sr-only">
                  {q.answer} {item.id}
                </span>
                <textarea
                  value={answer}
                  onChange={(e) => update(item.id, e.target.value)}
                  rows={2}
                  placeholder={ui.report.answerPlaceholder}
                  className="w-full resize-y rounded-lg border border-line bg-ink/60 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-primary/60"
                />
              </label>
              <p className="mt-2 hidden text-sm print:block">
                <span className="font-medium">{q.answer}: </span>
                {answer.trim() || q.noAnswer}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="no-print flex flex-col gap-3 rounded-xl border border-line bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-fg">{ui.report.answered(answeredCount, questions.length)}</p>
          <p className="mt-0.5 text-xs text-fg-subtle">{ui.report.recheckHint}</p>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-fg">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
            {copied ? ui.report.copied : ui.report.copyQuestions}
          </Button>
          {answeredCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAnswers({});
                saveAnswers(report.id, {});
              }}
            >
              {ui.report.clearAnswers}
            </Button>
          ) : null}
          <Button size="sm" onClick={recheck} disabled={answeredCount === 0 || busy || !canRecheck}>
            <RotateCcw aria-hidden className="size-4" />
            {ui.report.recheck}
          </Button>
        </div>
      </div>
    </div>
  );
}
