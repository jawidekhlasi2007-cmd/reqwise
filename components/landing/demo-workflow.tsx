"use client";

import Link from "next/link";
import { useUi } from "@/components/language-provider";
import { buttonClasses } from "@/components/ui/button";
import { sampleReportId } from "@/lib/ui-language";

export function DemoWorkflow() {
  const { t, language } = useUi();
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="panel grid grid-cols-1 gap-10 p-8 sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <h2 id="try" className="scroll-mt-24 text-[1.9rem] font-semibold leading-tight tracking-[-0.02em] text-fg">
            {t.tryIt.title}
          </h2>
          <p className="mt-3 text-fg-muted">{t.tryIt.text}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard" className={buttonClasses()}>
              {t.hero.primary}
            </Link>
            <Link href={`/report/${sampleReportId(language)}`} className={buttonClasses({ variant: "secondary" })}>
              {t.hero.secondary}
            </Link>
          </div>
        </div>
        <ol className="grid grid-cols-1 gap-3">
          {t.tryIt.steps.map((step, index) => (
            <li key={step} className="flex gap-4 rounded-xl border border-line bg-ink/40 px-4 py-3.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <span className="pt-0.5 text-fg">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
