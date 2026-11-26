"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentName, PipelineEvent, Report, ReportLanguage, StepMetrics, StepStatus } from "@/types";

export const PIPELINE_STEPS: AgentName[] = ["extraction", "validation", "api", "risk", "clarification", "recommendation", "report"];

export interface StepState {
  status: StepStatus;
  detail?: string;
  code?: string;
  metrics?: StepMetrics;
  model?: string;
  chars?: number;
  durationMs?: number;
  startedAt?: number;
}

type Phase = "idle" | "running" | "done" | "error";

export interface AnalysisError {
  message: string;
  code?: string;
}

class AnalysisFailure extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

const initialSteps = (): Record<AgentName, StepState> =>
  Object.fromEntries(PIPELINE_STEPS.map((s) => [s, { status: "pending" as StepStatus }])) as Record<AgentName, StepState>;

/** Runs /api/analyze and turns its NDJSON event stream into UI state. */
export function useAnalysis() {
  const [steps, setSteps] = useState<Record<AgentName, StepState>>(initialSteps);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<AnalysisError | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const apply = useCallback((event: PipelineEvent) => {
    if (event.type === "agent") {
      setSteps((prev) => ({
        ...prev,
        [event.agent]: {
          ...prev[event.agent],
          status: event.status,
          detail: event.detail ?? prev[event.agent].detail,
          metrics: event.metrics ?? prev[event.agent].metrics,
          code: event.code,
          model: event.model ?? prev[event.agent].model,
          durationMs: event.durationMs ?? prev[event.agent].durationMs,
          startedAt: event.status === "running" ? Date.now() : prev[event.agent].startedAt,
        },
      }));
    } else if (event.type === "progress") {
      setSteps((prev) => ({ ...prev, [event.agent]: { ...prev[event.agent], chars: event.chars } }));
    }
  }, []);

  const start = useCallback(
    async (payload: { document: string; fileName: string; language: ReportLanguage }): Promise<Report | null> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setSteps(initialSteps());
      setError(null);
      setPhase("running");

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const body = (await response.json().catch(() => null)) as { error?: string; code?: string } | null;
          throw new AnalysisFailure(body?.error ?? `The server responded with ${response.status}.`, body?.code);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const outcome: { report: Report | null; failure: AnalysisError | null } = { report: null, failure: null };

        const handle = (line: string) => {
          if (!line.trim()) return;
          let event: PipelineEvent;
          try {
            event = JSON.parse(line) as PipelineEvent;
          } catch {
            return;
          }
          if (event.type === "result") outcome.report = event.report;
          else if (event.type === "error") outcome.failure = { message: event.message, code: event.code };
          else apply(event);
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline = buffer.indexOf("\n");
          while (newline >= 0) {
            handle(buffer.slice(0, newline));
            buffer = buffer.slice(newline + 1);
            newline = buffer.indexOf("\n");
          }
        }
        handle(buffer + decoder.decode());

        if (outcome.failure) throw new AnalysisFailure(outcome.failure.message, outcome.failure.code);
        if (!outcome.report) throw new AnalysisFailure("The analysis ended without a report. Try again.", "generic");
        setPhase("done");
        return outcome.report;
      } catch (err) {
        if (controller.signal.aborted) {
          setPhase("idle");
          setSteps(initialSteps());
          return null;
        }
        if (err instanceof AnalysisFailure) setError({ message: err.message, code: err.code });
        else setError({ message: err instanceof Error ? err.message : "The analysis failed.", code: "network" });
        setPhase("error");
        return null;
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [apply],
  );

  const cancel = useCallback(() => controllerRef.current?.abort(), []);

  return { steps, phase, error, start, cancel };
}
