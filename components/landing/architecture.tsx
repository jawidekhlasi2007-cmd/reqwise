"use client";

import { ArrowDown } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { SectionHeading } from "./section-heading";

function Step({ name, text, kind }: { name: string; text: string; kind: "ai" | "rules" }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${kind === "ai" ? "border-secondary/40 bg-secondary/[0.07]" : "border-accent/40 bg-accent/[0.06]"}`}>
      <p className="font-medium text-fg">{name}</p>
      <p className="mt-0.5 text-sm leading-snug text-fg-muted">{text}</p>
    </div>
  );
}

function Down() {
  return (
    <div className="flex justify-center py-2 text-fg-subtle" aria-hidden>
      <ArrowDown className="size-4" />
    </div>
  );
}

/** A plain-language picture of the agent pipeline. */
export function Architecture() {
  const { t } = useUi();
  const s = t.inside;
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.25fr] lg:items-start">
        <div>
          <SectionHeading id="inside" title={s.title} intro={s.intro} />
          <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-fg-muted">
            <li className="flex items-center gap-2.5">
              <span aria-hidden className="size-3 rounded-sm border border-secondary/60 bg-secondary/30" />
              {s.legendAi}
            </li>
            <li className="flex items-center gap-2.5">
              <span aria-hidden className="size-3 rounded-sm border border-accent/60 bg-accent/30" />
              {s.legendRules}
            </li>
          </ul>
        </div>

        <div className="panel p-5 sm:p-6">
          <Step kind="ai" {...s.reader} />
          <Down />
          <div className="rounded-2xl border border-dashed border-line-strong p-3">
            <p className="mb-2.5 text-center text-xs text-fg-subtle">{s.together}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Step kind="ai" {...s.quality} />
              <Step kind="ai" {...s.api} />
              <Step kind="ai" {...s.security} />
            </div>
          </div>
          <Down />
          <Step kind="rules" {...s.scorer} />
          <Down />
          <div className="rounded-2xl border border-dashed border-line-strong p-3">
            <p className="mb-2.5 text-center text-xs text-fg-subtle">{s.togetherTwo}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Step kind="ai" {...s.interviewer} />
              <Step kind="ai" {...s.editor} />
            </div>
          </div>
          <Down />
          <Step kind="rules" {...s.builder} />
        </div>
      </div>
    </section>
  );
}
