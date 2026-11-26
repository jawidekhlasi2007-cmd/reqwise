"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import type { DocumentStats, ReportLanguage } from "@/types";

interface AnalyzeCardProps {
  stats: DocumentStats | null;
  language: ReportLanguage;
  onLanguageChange: (language: ReportLanguage) => void;
  onAnalyze: () => void;
  onCancel: () => void;
  running: boolean;
  canAnalyze: boolean;
  keyMissing: boolean;
}

export function AnalyzeCard({ stats, language, onLanguageChange, onAnalyze, onCancel, running, canAnalyze, keyMissing }: AnalyzeCardProps) {
  const { t } = useUi();
  const s = t.stats;
  const items = [
    { label: s.words, value: stats?.words },
    { label: s.requirements, value: stats?.requirements, hint: s.requirementsHint },
    { label: s.sections, value: stats?.sections },
    { label: s.endpoints, value: stats?.apiEndpoints },
  ];

  return (
    <div className="panel p-5">
      <h2 className="text-[15px] font-semibold text-fg">{s.title}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {items.map((item) => (
          <div key={item.label} className="bg-ink-2 px-4 py-3">
            <dt className="text-xs text-fg-muted">
              {item.label}
              {item.hint ? <span className="text-fg-subtle"> ({item.hint})</span> : null}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-fg">{item.value === undefined ? "–" : formatNumber(item.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-fg-muted">
        {s.language}: <span className="text-fg">{stats ? s.languages[stats.language] : "–"}</span>
      </p>

      <div className="mt-5 border-t border-line pt-5">
        <label htmlFor="report-language" className="text-sm font-medium text-fg">
          {s.reportLanguage}
        </label>
        <select
          id="report-language"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value === "ru" ? "ru" : "en")}
          disabled={running}
          className="mt-2 h-10 w-full rounded-[10px] border border-line-strong bg-ink-2 px-3 text-sm text-fg outline-none focus:border-primary"
        >
          <option value="en">{s.reportLanguages.en}</option>
          <option value="ru">{s.reportLanguages.ru}</option>
        </select>

        {running ? (
          <Button variant="secondary" className="mt-4 w-full" onClick={onCancel}>
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            {s.stop}
          </Button>
        ) : (
          <Button className="mt-4 w-full" size="lg" onClick={onAnalyze} disabled={!canAnalyze || keyMissing}>
            <Sparkles aria-hidden className="size-4" />
            {s.check}
          </Button>
        )}
        {!stats ? <p className="mt-2 text-sm text-fg-subtle">{s.hintUpload}</p> : null}
        {stats && keyMissing ? <p className="mt-2 text-sm text-fg-subtle">{s.hintKey}</p> : null}
      </div>
    </div>
  );
}
