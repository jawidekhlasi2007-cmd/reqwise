import type { z } from "zod";

/*
 * Minimal Gemini client built on the public REST API (no SDK dependency).
 *
 * - Streams every response over Server-Sent Events and reports progress.
 * - Forces JSON output and validates it with the caller's Zod schema.
 * - Retries transient failures, honours rate-limit retry hints, repairs
 *   malformed JSON once, and falls back to the next configured model when a
 *   model is not available to the API key.
 *
 * Server-only: it reads GEMINI_API_KEY and must never be imported by a client component.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_FALLBACKS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
const REQUEST_TIMEOUT_MS = 100_000;

export type GeminiErrorCode =
  | "missing_key"
  | "invalid_key"
  | "rate_limited"
  | "model_unavailable"
  | "overloaded"
  | "bad_request"
  | "blocked"
  | "output_too_long"
  | "invalid_json"
  | "invalid_shape"
  | "timeout"
  | "aborted"
  | "network";

export class GeminiError extends Error {
  readonly code: GeminiErrorCode;
  readonly status?: number;
  readonly retryAfterMs?: number;

  constructor(message: string, code: GeminiErrorCode, status?: number, retryAfterMs?: number) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export type ThinkingLevel = "off" | "low" | "medium";

export interface GenerateJsonOptions<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  maxOutputTokens?: number;
  /** Internal reasoning effort. The model thinks privately; thoughts are never returned. */
  thinking?: ThinkingLevel;
  temperature?: number;
  signal?: AbortSignal;
  /** Called while the response streams in, with the number of characters received so far. */
  onProgress?: (chars: number) => void;
}

export interface GenerateJsonResult<T> {
  data: T;
  model: string;
  outputChars: number;
}

interface GeminiConfig {
  apiKey: string;
  models: string[];
}

export function getGeminiConfig(): GeminiConfig {
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const fallbackEnv = process.env.GEMINI_FALLBACK_MODELS;
  const fallbacks =
    fallbackEnv === undefined
      ? DEFAULT_FALLBACKS
      : fallbackEnv
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
  return { apiKey, models: Array.from(new Set([primary, ...fallbacks])) };
}

export function isGeminiConfigured(): boolean {
  return getGeminiConfig().apiKey.length > 0;
}

/** The first model that answered successfully; tried first on later calls so we don't waste quota on 404s. */
let workingModel: string | null = null;
/** Models that rejected the thinkingConfig parameter. */
const noThinkingModels = new Set<string>();

export async function generateJson<T>(options: GenerateJsonOptions<T>): Promise<GenerateJsonResult<T>> {
  const { apiKey, models } = getGeminiConfig();
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY is not set. Add it to .env.local and restart the server.", "missing_key");
  }

  const ordered = workingModel && models.includes(workingModel) ? [workingModel, ...models.filter((m) => m !== workingModel)] : models;
  // The most useful error to report if every model fails: "busy" or "limit reached" beats "not available".
  let reportable: GeminiError | null = null;

  for (const model of ordered) {
    try {
      const result = await generateWithModel(model, apiKey, options);
      workingModel = model;
      return result;
    } catch (error) {
      if (error instanceof GeminiError && FALLBACK_CODES.has(error.code)) {
        // Each model has its own capacity and free-tier quota, so the next one often works.
        console.warn(`[gemini] ${model} failed (${error.code}${error.status ? ` ${error.status}` : ""}); trying the next model`);
        if (!reportable || reportable.code === "model_unavailable") reportable = error;
        continue;
      }
      throw error;
    }
  }

  if (reportable && reportable.code !== "model_unavailable") throw reportable;
  throw new GeminiError(
    `None of the configured models are available to this API key (${ordered.join(", ")}). Set GEMINI_MODEL in .env.local to a model listed in Google AI Studio.`,
    "model_unavailable",
    reportable?.status,
  );
}

/** Errors after which the next configured model is tried instead of giving up. */
const FALLBACK_CODES = new Set<GeminiErrorCode>(["model_unavailable", "overloaded", "rate_limited", "timeout"]);

async function generateWithModel<T>(model: string, apiKey: string, options: GenerateJsonOptions<T>): Promise<GenerateJsonResult<T>> {
  let prompt = options.prompt;
  let transientRetries = 0;
  let repairRetries = 0;
  let rateLimitRetries = 0;

  for (;;) {
    throwIfAborted(options.signal);
    try {
      const body = buildRequestBody(model, { ...options, prompt });
      const { text } = await streamOnce(model, apiKey, body, options);
      const raw = parseJsonLoose(text);
      const parsed = options.schema.safeParse(raw);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new GeminiError(
          `Gemini returned JSON with an unexpected shape (${issue?.path.join(".") || "root"}: ${issue?.message ?? "invalid"}).`,
          "invalid_shape",
        );
      }
      return { data: parsed.data, model, outputChars: text.length };
    } catch (error) {
      if (!(error instanceof GeminiError)) throw error;

      if (error.code === "bad_request" && !noThinkingModels.has(model) && /thinking/i.test(error.message)) {
        noThinkingModels.add(model);
        continue;
      }
      if ((error.code === "invalid_json" || error.code === "invalid_shape") && repairRetries < 1) {
        repairRetries += 1;
        prompt = `${options.prompt}\n\nIMPORTANT: Your previous answer was not valid JSON for the required schema (${error.message}). Answer again with one complete JSON object only.`;
        continue;
      }
      if (error.code === "rate_limited" && rateLimitRetries < 1 && (error.retryAfterMs ?? 0) <= 30_000) {
        rateLimitRetries += 1;
        await sleep(Math.max(error.retryAfterMs ?? 0, 4_000), options.signal);
        continue;
      }
      if ((error.code === "overloaded" || error.code === "network" || error.code === "timeout") && transientRetries < 2) {
        transientRetries += 1;
        await sleep(1_500 * 2 ** (transientRetries - 1), options.signal);
        continue;
      }
      throw error;
    }
  }
}

function buildRequestBody(model: string, options: GenerateJsonOptions<unknown>) {
  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    maxOutputTokens: options.maxOutputTokens ?? 16_384,
  };

  const isGemini25 = model.startsWith("gemini-2.5");
  // Gemini 3+ models are tuned for their default temperature; only pin it on 2.5.
  if (isGemini25) generationConfig.temperature = options.temperature ?? 0.2;

  if (!noThinkingModels.has(model)) {
    const level = options.thinking ?? "low";
    if (isGemini25) {
      const budget = level === "off" ? 0 : level === "low" ? 1_024 : 4_096;
      generationConfig.thinkingConfig = { thinkingBudget: budget };
    } else if (model.startsWith("gemini-3")) {
      generationConfig.thinkingConfig = { thinkingLevel: level === "medium" ? "medium" : "low" };
    }
  }

  return {
    systemInstruction: { parts: [{ text: options.system }] },
    contents: [{ role: "user", parts: [{ text: options.prompt }] }],
    generationConfig,
  };
}

interface StreamChunk {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

async function streamOnce(
  model: string,
  apiKey: string,
  body: unknown,
  options: Pick<GenerateJsonOptions<unknown>, "signal" | "onProgress">,
): Promise<{ text: string }> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onParentAbort, { once: true });

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw abortOrNetworkError(timedOut, options.signal);
    }

    if (!response.ok) throw await toGeminiError(response, model);
    if (!response.body) throw new GeminiError("Gemini returned an empty response.", "network");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const state: { text: string; finishReason?: string; blockReason?: string } = { text: "" };

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") return;
      let chunk: StreamChunk;
      try {
        chunk = JSON.parse(payload) as StreamChunk;
      } catch {
        return;
      }
      state.blockReason = chunk.promptFeedback?.blockReason ?? state.blockReason;
      const candidate = chunk.candidates?.[0];
      state.finishReason = candidate?.finishReason ?? state.finishReason;
      const before = state.text.length;
      for (const part of candidate?.content?.parts ?? []) {
        if (part.text && !part.thought) state.text += part.text;
      }
      if (state.text.length > before) options.onProgress?.(state.text.length);
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          handleLine(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf("\n");
        }
      }
      buffer += decoder.decode();
      if (buffer) handleLine(buffer);
    } catch (error) {
      if (error instanceof GeminiError) throw error;
      throw abortOrNetworkError(timedOut, options.signal);
    }

    if (state.blockReason) {
      throw new GeminiError(`Gemini blocked the request (${state.blockReason}). Remove sensitive content from the document and retry.`, "blocked");
    }
    if (state.finishReason === "SAFETY" || state.finishReason === "PROHIBITED_CONTENT") {
      throw new GeminiError("Gemini stopped the response for safety reasons.", "blocked");
    }
    if (state.finishReason === "MAX_TOKENS") {
      throw new GeminiError("The answer exceeded the output limit. Try a shorter document or split it into parts.", "output_too_long");
    }
    if (!state.text.trim()) throw new GeminiError("Gemini returned an empty answer.", "invalid_json");
    return { text: state.text };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onParentAbort);
  }
}

function abortOrNetworkError(timedOut: boolean, signal?: AbortSignal): GeminiError {
  if (signal?.aborted) return new GeminiError("The analysis was cancelled.", "aborted");
  if (timedOut) return new GeminiError("Gemini did not answer in time.", "timeout");
  return new GeminiError("Could not reach the Gemini API. Check your internet connection.", "network");
}

interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{ "@type"?: string; retryDelay?: string; reason?: string }>;
  };
}

async function toGeminiError(response: Response, model: string): Promise<GeminiError> {
  let body: GoogleErrorBody = {};
  try {
    body = (await response.json()) as GoogleErrorBody;
  } catch {
    // Non-JSON error body; fall back to the HTTP status below.
  }
  const message = body.error?.message ?? response.statusText ?? "Unknown error";
  const status = response.status;
  const details = body.error?.details ?? [];

  if (status === 404) {
    return new GeminiError(`Model ${model} is not available to this API key.`, "model_unavailable", status);
  }
  if (status === 429) {
    const delay = details.find((d) => d.retryDelay)?.retryDelay;
    const retryAfterMs = delay ? Math.ceil(Number.parseFloat(delay) * 1000) : undefined;
    return new GeminiError(
      "Gemini rate limit reached (free tier). Wait a minute and run the analysis again, or check your daily quota in Google AI Studio.",
      "rate_limited",
      status,
      Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
    );
  }
  const keyProblem = details.some((d) => d.reason === "API_KEY_INVALID") || /api key/i.test(message);
  if (status === 401 || status === 403 || (status === 400 && keyProblem)) {
    return new GeminiError("Gemini rejected the API key. Check GEMINI_API_KEY in .env.local.", "invalid_key", status);
  }
  if (status >= 500) {
    return new GeminiError("Gemini is temporarily overloaded. Retrying usually helps.", "overloaded", status);
  }
  return new GeminiError(`Gemini rejected the request: ${message}`, "bad_request", status);
}

/** Parses JSON even when the model wraps it in code fences or adds stray text around it. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[{[]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
    throw new GeminiError("Gemini returned malformed JSON.", "invalid_json");
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new GeminiError("The analysis was cancelled.", "aborted");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new GeminiError("The analysis was cancelled.", "aborted"));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new GeminiError("The analysis was cancelled.", "aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
