"use client";

import { Braces, FileText, Printer } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { reportToMarkdown } from "@/lib/report-markdown";
import { getAnswers } from "@/lib/storage";
import { downloadText, slugify } from "@/lib/utils";
import type { Report } from "@/types";

export function ExportButtons({ report }: { report: Report }) {
  const { t } = useUi();
  const base = `${slugify(report.fileName)}-validation-report`;

  const exportPdf = () => {
    // The browser's print dialog saves a PDF with real, selectable text and correct Cyrillic glyphs.
    const previousTitle = document.title;
    document.title = base;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={exportPdf}>
        <Printer aria-hidden className="size-4" />
        {t.report.downloadPdf}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => downloadText(`${base}.md`, reportToMarkdown(report, getAnswers(report.id)), "text/markdown")}>
        <FileText aria-hidden className="size-4" />
        {t.report.markdown}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => downloadText(`${base}.json`, JSON.stringify({ ...report, answers: getAnswers(report.id) }, null, 2), "application/json")}>
        <Braces aria-hidden className="size-4" />
        {t.report.json}
      </Button>
    </div>
  );
}
