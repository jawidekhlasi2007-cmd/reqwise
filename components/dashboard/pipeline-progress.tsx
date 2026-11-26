"use client";

import { useEffect, useState } from "react";
import { Circle, CircleAlert, CircleCheck, CircleMinus, LoaderCircle } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { PIPELINE_STEPS, type StepState } from "@/hooks/use-analysis";
import { reportStrings } from "@/lib/i18n";
import { errorMessage } from "@/lib/ui-strings";
import { cn, formatDuration } from "@/lib/utils";
import type { AgentName } from "@/types";

function Elapsed({ since, unit }: { since: number; unit: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className="tabular-nums">
      {Math.max(0, Math.round((now - since) / 1000))} {unit}
    </span>
  );
}

function StatusIcon({ status }: { status: StepState["status"] }) {
  switch (status) {
    case "running":
      return <LoaderCircle aria-hidden className="size-4 animate-spin text-primary" />;
    case "done":
      return <CircleCheck aria-hidden className="size-4 text-success" />;
    case "skipped":
      return <CircleMinus aria-hidden className="size-4 text-fg-subtle" />;
    case "error":
      return <CircleAlert aria-hidden className="size-4 text-danger" />;
    default:
      return <Circle aria-hidden className="size-4 text-fg-subtle/60" />;
  }
}

export function PipelineProgress({ steps, error, active }: { steps: Record<AgentName, StepState>; error: string | null; active: boolean }) {
  const { t, language } = useUi();
  const p = t.progress;
  const describe = reportStrings(language).describe;

  return (
    <div className="panel p-5" aria-live="polite">
      <h2 className="text-[15px] font-semibold text-fg">{p.title}</h2>
      <ol className="mt-4 grid grid-cols-1 gap-1">
        {PIPELINE_STEPS.map((agent) => {
          const step = steps[agent];
          let detail = p.steps[agent].text;
          if (step.status === "running") detail = step.chars ? p.receiving : p.waiting;
          else if (step.status === "done" || step.status === "skipped") detail = describe(agent, step.status, step.metrics ?? {}) ?? step.detail ?? detail;
          else if (step.status === "error") detail = errorMessage(t, step.code, step.detail ?? p.status.error);
          return (
            <li key={agent} className={cn("flex items-start gap-3 rounded-lg px-2.5 py-2", step.status === "running" && "bg-primary/[0.07]")}>
              <span className="mt-0.5">
                <StatusIcon status={step.status} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-medium", step.status === "pending" ? "text-fg-muted" : "text-fg")}>{p.steps[agent].label}</span>
                  <span className="shrink-0 text-xs text-fg-subtle">
                    <span className="sr-only">{p.status[step.status]}, </span>
                    {step.status === "running" && step.startedAt ? <Elapsed since={step.startedAt} unit={language === "ru" ? "с" : "s"} /> : null}
                    {step.status === "done" && step.durationMs !== undefined ? formatDuration(step.durationMs, language) : null}
                  </span>
                </div>
                <p className={cn("mt-0.5 text-xs leading-snug", step.status === "error" ? "text-fg" : "text-fg-subtle")}>{detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-fg">
          {error}
        </p>
      ) : null}
      {!active && !error ? <p className="mt-3 text-xs text-fg-subtle">{p.usually}</p> : null}
    </div>
  );
}
