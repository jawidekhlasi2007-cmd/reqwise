"use client";

import { useUi } from "@/components/language-provider";
import { SectionHeading } from "./section-heading";

export function Catches() {
  const { t } = useUi();
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading id="features" title={t.finds.title} intro={t.finds.intro} />
      <dl className="mt-10 grid grid-cols-1 gap-x-12 border-t border-line md:grid-cols-2">
        {t.finds.items.map((item) => (
          <div key={item.name} className="flex flex-col gap-1 border-b border-line py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <div>
              <dt className="font-medium text-fg">{item.name}</dt>
              <dd className="mt-1 text-sm text-fg-muted">{item.text}</dd>
            </div>
            <dd className="doc-text shrink-0 text-[0.95rem] text-fg-muted italic sm:max-w-[45%] sm:text-right">“{item.example}”</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
