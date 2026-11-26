import { getGeminiConfig } from "@/lib/gemini";

export const dynamic = "force-dynamic";

/** Tells the dashboard whether a Gemini key is configured. Never returns the key itself. */
export async function GET() {
  const { apiKey, models } = getGeminiConfig();
  return Response.json({ configured: apiKey.length > 0, models });
}
