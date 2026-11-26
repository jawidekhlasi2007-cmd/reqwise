"use client";

import { cn } from "@/lib/utils";
import type { UiLanguage } from "@/lib/ui-language";
import { useUi } from "./language-provider";

const OPTIONS: Array<{ value: UiLanguage; short: string }> = [
  { value: "en", short: "EN" },
  { value: "ru", short: "RU" },
];

/** Two-option switch for the interface language. */
export function LanguageSwitch() {
  const { language, setLanguage, t } = useUi();
  return (
    <div role="group" aria-label={t.languageSwitch.label} className="flex rounded-[10px] border border-line-strong p-0.5">
      {OPTIONS.map((option) => {
        const active = option.value === language;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.value}
            aria-pressed={active}
            aria-label={t.languageSwitch[option.value]}
            title={t.languageSwitch[option.value]}
            onClick={() => !active && setLanguage(option.value)}
            className={cn(
              "h-7 rounded-[8px] px-2.5 text-xs font-semibold transition-colors",
              active ? "bg-white/[0.12] text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}
