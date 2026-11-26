"use client";

import { Check } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { SectionHeading } from "./section-heading";

export function StandardsSection() {
  const { t } = useUi();
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading id="standards" title={t.standards.title} intro={t.standards.intro} />
      <ul className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {t.standards.qualities.map((q) => (
          <li key={q.name} className="flex gap-3 bg-ink-2 p-5">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
            <div>
              <p className="font-medium text-fg">{q.name}</p>
              <p className="mt-1 text-sm text-fg-muted">{q.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
