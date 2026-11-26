"use client";

import Link from "next/link";
import { useUi } from "@/components/language-provider";
import { buttonClasses } from "@/components/ui/button";
import { sampleReportId } from "@/lib/ui-language";
import { AnnotatedDemo } from "./annotated-demo";

export function Hero() {
  const { t, language } = useUi();
  return (
    <section className="relative">
      <div className="page-glow pointer-events-none absolute inset-x-0 top-0 h-[640px]" aria-hidden />
      <div className="relative mx-auto grid grid-cols-1 max-w-6xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1fr_1.15fr] lg:pt-20">
        <div className="motion-safe:animate-rise">
          <h1 className="text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.025em] text-fg sm:text-[2.75rem]">{t.hero.title}</h1>
          <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-fg-muted">{t.hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className={buttonClasses({ size: "lg" })}>
              {t.hero.primary}
            </Link>
            <Link href={`/report/${sampleReportId(language)}`} className={buttonClasses({ variant: "secondary", size: "lg" })}>
              {t.hero.secondary}
            </Link>
          </div>
          <p className="mt-8 max-w-[36rem] text-sm leading-relaxed text-fg-subtle">{t.hero.note}</p>
        </div>
        <AnnotatedDemo />
      </div>
    </section>
  );
}
