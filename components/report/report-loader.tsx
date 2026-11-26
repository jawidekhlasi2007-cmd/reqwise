"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { SiteHeader } from "@/components/site-header";
import { buttonClasses } from "@/components/ui/button";
import { useReports } from "@/hooks/use-reports";
import { getReport } from "@/lib/storage";
import { sampleReportId } from "@/lib/ui-language";
import type { Report } from "@/types";
import { ReportView } from "./report-view";

type State = { status: "loading" } | { status: "ready"; report: Report } | { status: "missing" };

/** Reports live in the browser, so the page loads them on the client. The example reports are loaded on demand. */
export function ReportLoader({ id }: { id: string }) {
  const { t, language } = useUi();
  const [state, setState] = useState<State>({ status: "loading" });
  const { reports } = useReports();

  useEffect(() => {
    let cancelled = false;
    if (id === "sample" || id === "sample-ru") {
      import("@/lib/sample-report")
        .then((mod) => {
          if (!cancelled) setState({ status: "ready", report: mod.getSampleReport(id === "sample-ru" ? "ru" : "en") });
        })
        .catch(() => {
          if (!cancelled) setState({ status: "missing" });
        });
    } else {
      const report = getReport(id);
      setState(report ? { status: "ready", report } : { status: "missing" });
    }
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <SiteHeader />
      {state.status === "loading" ? (
        <div className="flex min-h-[60vh] items-center justify-center gap-2 text-fg-muted" role="status">
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
          {t.report.loading}
        </div>
      ) : null}
      {state.status === "missing" ? (
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
          <h1 className="text-xl font-semibold text-fg">{t.report.missingTitle}</h1>
          <p className="mt-2 text-fg-muted">{t.report.missingText}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className={buttonClasses()}>
              {t.nav.start}
            </Link>
            <Link href={`/report/${sampleReportId(language)}`} className={buttonClasses({ variant: "secondary" })}>
              {t.nav.sample}
            </Link>
          </div>
        </div>
      ) : null}
      {state.status === "ready" ? <ReportView report={state.report} history={reports} /> : null}
    </>
  );
}
