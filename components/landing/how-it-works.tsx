"use client";

import { useUi } from "@/components/language-provider";
import { SectionHeading } from "./section-heading";

export function HowItWorks() {
  const { t } = useUi();
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading id="how-it-works" title={t.how.title} />
      <ol className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
        {t.how.steps.map((step, index) => (
          <li key={step.title} className="border-t-2 border-primary/60 pt-4">
            <span className="text-sm font-semibold text-primary">{index + 1}</span>
            <h3 className="mt-1 text-lg font-medium text-fg">{step.title}</h3>
            <p className="mt-2 leading-relaxed text-fg-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
