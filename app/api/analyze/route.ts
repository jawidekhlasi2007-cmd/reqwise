import { z } from "zod";
import { PipelineError, runPipeline } from "@/agents/pipeline";
import { GeminiError, isGeminiConfigured } from "@/lib/gemini";
import { reportLanguageSchema } from "@/lib/schemas";
import type { PipelineEvent } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Five model calls can take 30-90 s on the free tier. Vercel Fluid compute allows up to 300 s on Hobby.
export const maxDuration = 300;

const BodySchema = z.object({
  document: z.string().trim().min(50, "The document is too short to analyse.").max(400_000, "The document is too long."),
  fileName: z.string().trim().max(200).catch("document"),
  language: reportLanguageSchema.catch("en"),
});

export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return Response.json(
      { error: "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.", code: "missing_key" },
      { status: 503 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid request." : "Invalid JSON body.";
    return Response.json({ error: message, code: "bad_request" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: PipelineEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };

      try {
        const report = await runPipeline(
          { document: body.document, fileName: body.fileName || "document", language: body.language },
          { onEvent: send, signal: request.signal },
        );
        send({ type: "result", report });
      } catch (error) {
        if (error instanceof GeminiError || error instanceof PipelineError) {
          send({ type: "error", message: error.message, code: error.code });
        } else {
          console.error("[analyze] unexpected error", error);
          send({ type: "error", message: "The analysis failed unexpectedly. Try again.", code: "internal" });
        }
      } finally {
        open = false;
        try {
          controller.close();
        } catch {
          // Stream already closed by the client.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
