"use client";

import { useState } from "react";
import { useUi } from "@/components/language-provider";
import { SEVERITY_META } from "@/components/report/severity";
import { reportStrings } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The hero's signature moment: a real requirement with its problems underlined, then rewritten. */
export function AnnotatedDemo() {
  const { t, language } = useUi();
  const [active, setActive] = useState<number | null>(null);
  const severityNames = reportStrings(language).severity;
  const { annotations, parts } = t.demo;

  return (
    <div className="panel relative overflow-hidden p-6 sm:p-7" key={language}>
      <div className="flex items-center justify-between gap-4 text-sm text-fg-subtle">
        <span>{t.demo.label}</span>
        <span>{t.demo.found(annotations.length)}</span>
      </div>

      <p className="doc-text mt-4 text-[1.2rem] leading-[1.7] sm:text-[1.3rem]">
        {parts.map((part, index) => {
          if (typeof part === "string") return <span key={index}>{part}</span>;
          const a = annotations[part - 1];
          const color = SEVERITY_META[a.severity].color;
          return (
            <span
              key={index}
              onMouseEnter={() => setActive(a.id)}
              onMouseLeave={() => setActive(null)}
              className={cn("flag rounded-[3px] transition-colors motion-safe:animate-underline", active === a.id && "bg-white/10")}
              style={{ backgroundImage: `linear-gradient(${color}, ${color})`, animationDelay: `${300 + a.id * 320}ms` }}
            >
              {a.phrase}
              <sup className="ml-0.5 font-sans text-[0.6em] font-semibold text-fg-muted">{a.id}</sup>
            </span>
          );
        })}
      </p>

      <ol className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2" aria-label={t.demo.listLabel}>
        {annotations.map((a) => {
          const meta = SEVERITY_META[a.severity];
          const Icon = meta.icon;
          return (
            <li
              key={a.id}
              tabIndex={0}
              onMouseEnter={() => setActive(a.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(a.id)}
              onBlur={() => setActive(null)}
              className={cn(
                "rounded-xl border border-line bg-ink/40 px-3.5 py-3 transition-colors motion-safe:animate-rise",
                active === a.id && "border-line-strong bg-white/[0.05]",
              )}
              style={{ animationDelay: `${450 + a.id * 320}ms` }}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-fg-muted">{a.id}</span>
                <Icon aria-hidden className="size-3.5 shrink-0" style={{ color: meta.color }} />
                <span className="font-medium text-fg">{a.title}</span>
              </div>
              <p className="mt-1 text-sm leading-snug text-fg-muted">{a.note}</p>
              <p className="mt-1.5 text-xs text-fg-subtle">{t.demo.meta(severityNames[a.severity], a.clause)}</p>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 border-t border-line pt-5 motion-safe:animate-rise" style={{ animationDelay: "1700ms" }}>
        <p className="text-sm font-medium text-accent">{t.demo.rewrittenLabel}</p>
        <p className="doc-text mt-2">{t.demo.rewritten}</p>
      </div>
    </div>
  );
}
