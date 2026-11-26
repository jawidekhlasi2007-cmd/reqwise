"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { useReports } from "@/hooks/use-reports";
import { deleteReport } from "@/lib/storage";
import { sampleReportId } from "@/lib/ui-language";
import { cn, formatDate, scoreTone } from "@/lib/utils";

const TONE_CLASS = { good: "bg-success", warn: "bg-warning", bad: "bg-danger" } as const;

export function RecentReports() {
  const { t, language } = useUi();
  const { reports, ready } = useReports();

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-fg">{t.recent.title}</h2>
        <Link href={`/report/${sampleReportId(language)}`} className="rounded-md text-sm text-primary hover:underline">
          {t.nav.sample}
        </Link>
      </div>
      {ready && reports.length === 0 ? <p className="mt-3 text-sm text-fg-muted">{t.recent.empty}</p> : null}
      <ul className="mt-3 grid grid-cols-1 gap-1">
        {reports.map((r) => (
          <li key={r.id} className="group flex items-center gap-2 rounded-lg hover:bg-white/[0.04]">
            <Link href={`/report/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2">
              <span className="flex w-10 shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums text-fg">
                <span aria-hidden className={cn("size-1.5 rounded-full", TONE_CLASS[scoreTone(r.overall)])} />
                {r.overall}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm text-fg" title={r.title || r.fileName}>
                  {r.title || r.fileName}
                </span>
                <span className="block text-xs text-fg-subtle">
                  {formatDate(r.createdAt, language)}, {t.recent.issues(r.issues)}, {t.recent.languages[r.language]}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => deleteReport(r.id)}
              aria-label={t.recent.delete(r.title || r.fileName)}
              className="mr-1 rounded-md p-2 text-fg-subtle opacity-70 transition hover:bg-white/[0.06] hover:text-fg group-hover:opacity-100"
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
