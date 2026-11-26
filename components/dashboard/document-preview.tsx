"use client";

import { FileText } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

const PREVIEW_LIMIT = 20_000;

export function DocumentPreview({ fileName, text, onReplace, disabled }: { fileName: string; text: string; onReplace: () => void; disabled: boolean }) {
  const { t } = useUi();
  const shown = text.length > PREVIEW_LIMIT ? text.slice(0, PREVIEW_LIMIT) : text;
  return (
    <div className="panel flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText aria-hidden className="size-4 shrink-0 text-fg-subtle" />
          <span className="truncate font-medium text-fg">{fileName}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onReplace} disabled={disabled}>
          {t.upload.replace}
        </Button>
      </div>
      <div className="max-h-[620px] overflow-auto px-6 py-5" tabIndex={0} aria-label={t.upload.previewLabel}>
        <p className="doc-text whitespace-pre-wrap text-[0.98rem]">{shown}</p>
        {text.length > PREVIEW_LIMIT ? (
          <p className="mt-4 text-sm text-fg-subtle">{t.upload.previewLimit(formatNumber(PREVIEW_LIMIT), formatNumber(text.length))}</p>
        ) : null}
      </div>
    </div>
  );
}
