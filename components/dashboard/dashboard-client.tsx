"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { SiteHeader } from "@/components/site-header";
import { useAnalysis } from "@/hooks/use-analysis";
import { computeDocumentStats, normaliseDocumentText } from "@/lib/document-stats";
import { saveReport, takeRecheck } from "@/lib/storage";
import { sampleReportId } from "@/lib/ui-language";
import { errorMessage } from "@/lib/ui-strings";
import type { DocumentStats, ReportLanguage } from "@/types";
import { AnalyzeCard } from "./analyze-card";
import { DocumentPreview } from "./document-preview";
import { PipelineProgress } from "./pipeline-progress";
import { RecentReports } from "./recent-reports";
import { UploadZone } from "./upload-zone";

interface LoadedDocument {
  fileName: string;
  text: string;
  stats: DocumentStats;
}

const SAMPLE_FILES = { en: "/samples/spending-limit-srs.md", ru: "/samples/spending-limit-srs-ru.md" } as const;

export function DashboardClient() {
  const router = useRouter();
  const { t, language: uiLanguage } = useUi();
  const analysis = useAnalysis();
  const [doc, setDoc] = useState<LoadedDocument | null>(null);
  const [reportLanguage, setReportLanguage] = useState<ReportLanguage>(uiLanguage);
  const [reportLanguageChosen, setReportLanguageChosen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<{ code?: string; message?: string } | null>(null);
  const [keyConfigured, setKeyConfigured] = useState<boolean | null>(null);
  const [recheckPending, setRecheckPending] = useState(false);
  const recheckStarted = useRef(false);

  // The report language follows the interface language until the user picks one.
  useEffect(() => {
    if (!reportLanguageChosen) setReportLanguage(uiLanguage);
  }, [uiLanguage, reportLanguageChosen]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((r) => r.json() as Promise<{ configured: boolean }>)
      .then((s) => !cancelled && setKeyConfigured(s.configured))
      .catch(() => !cancelled && setKeyConfigured(null));
    return () => {
      cancelled = true;
    };
  }, []);

  // A re-check requested from a report: load the document with the answers appended, then start automatically.
  useEffect(() => {
    const request = takeRecheck();
    if (!request) return;
    const text = normaliseDocumentText(request.text);
    setDoc({ fileName: request.fileName, text, stats: computeDocumentStats(text) });
    setReportLanguage(request.language);
    setReportLanguageChosen(true);
    setRecheckPending(true);
  }, []);

  const loadText = (fileName: string, raw: string) => {
    const text = normaliseDocumentText(raw);
    setDoc({ fileName, text, stats: computeDocumentStats(text) });
    setUploadError(null);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/parse", { method: "POST", body: form });
      const body = (await response.json()) as { text?: string; fileName?: string; stats?: DocumentStats; error?: string; code?: string };
      if (!response.ok || !body.text || !body.stats) {
        setUploadError({ code: body.code ?? "generic", message: body.error });
        return;
      }
      setDoc({ fileName: body.fileName ?? file.name, text: body.text, stats: body.stats });
    } catch {
      setUploadError({ code: "generic" });
    } finally {
      setBusy(false);
    }
  };

  const handleSample = async (sampleLanguage: "en" | "ru") => {
    setBusy(true);
    try {
      const response = await fetch(SAMPLE_FILES[sampleLanguage]);
      if (!response.ok) throw new Error("sample");
      loadText(sampleLanguage === "ru" ? "spending-limit-srs-ru.md" : "spending-limit-srs.md", await response.text());
    } catch {
      setUploadError({ code: "sample_failed" });
    } finally {
      setBusy(false);
    }
  };

  const handleAnalyze = async () => {
    if (!doc) return;
    const report = await analysis.start({ document: doc.text, fileName: doc.fileName, language: reportLanguage });
    if (report) {
      saveReport(report);
      router.push(`/report/${report.id}`);
    }
  };

  const running = analysis.phase === "running";

  useEffect(() => {
    if (!recheckPending || !doc || keyConfigured === null || recheckStarted.current) return;
    recheckStarted.current = true;
    setRecheckPending(false);
    if (keyConfigured) void handleAnalyze();
    // handleAnalyze reads the latest doc and language from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recheckPending, doc, keyConfigured]);

  return (
    <>
      <SiteHeader showStart={false} />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t.dashboard.title}</h1>
          <p className="text-fg-muted">{t.dashboard.subtitle}</p>
        </div>

        {doc && recheckStarted.current && running ? (
          <p role="status" className="mt-6 rounded-2xl border border-primary/40 bg-primary/[0.08] px-4 py-3 text-sm text-fg">
            {t.progress.recheckLoaded}
          </p>
        ) : null}

        {keyConfigured === false ? (
          <div role="status" className="mt-6 flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/[0.08] p-4 sm:flex-row sm:items-center">
            <KeyRound aria-hidden className="size-5 shrink-0 text-warning" />
            <p className="flex-1 text-sm text-fg">
              {t.dashboard.noKey}{" "}
              <Link href={`/report/${sampleReportId(uiLanguage)}`} className="text-primary underline-offset-2 hover:underline">
                {t.dashboard.noKeyLink}
              </Link>
              .
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="grid grid-cols-1 content-start gap-6">
            {doc ? (
              <DocumentPreview fileName={doc.fileName} text={doc.text} onReplace={() => setDoc(null)} disabled={running} />
            ) : (
              <UploadZone
                busy={busy}
                error={uploadError ? errorMessage(t, uploadError.code, uploadError.message) : null}
                onFile={handleFile}
                onPaste={(text) => loadText("pasted-text.txt", text)}
                onSample={handleSample}
              />
            )}
          </div>
          <div className="grid grid-cols-1 content-start gap-6">
            <AnalyzeCard
              stats={doc?.stats ?? null}
              language={reportLanguage}
              onLanguageChange={(value) => {
                setReportLanguage(value);
                setReportLanguageChosen(true);
              }}
              onAnalyze={handleAnalyze}
              onCancel={analysis.cancel}
              running={running}
              canAnalyze={Boolean(doc) && !busy}
              keyMissing={keyConfigured === false}
            />
            <PipelineProgress
              steps={analysis.steps}
              error={analysis.error ? errorMessage(t, analysis.error.code, analysis.error.message) : null}
              active={running}
            />
            <RecentReports />
          </div>
        </div>
      </main>
    </>
  );
}
