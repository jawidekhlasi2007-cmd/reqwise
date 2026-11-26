"use client";

import { ChevronDown } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { SectionHeading } from "./section-heading";

export function Faq() {
  const { t } = useUi();
  return (
    <section className="mx-auto max-w-3xl px-5 py-20">
      <SectionHeading id="faq" title={t.faq.title} />
      <div className="mt-8 divide-y divide-line border-y border-line">
        {t.faq.items.map((item) => (
          <details key={item.q} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 font-medium text-fg [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown aria-hidden className="size-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-5 pr-8 leading-relaxed text-fg-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
