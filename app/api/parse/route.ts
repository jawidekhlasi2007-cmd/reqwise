import { computeDocumentStats, normaliseDocumentText } from "@/lib/document-stats";
import { DocumentParseError, MAX_FILE_BYTES, extractDocumentText } from "@/lib/document-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Send the document as multipart form data in a field named \"file\".", code: "no_file" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file was received.", code: "no_file" }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "The file is empty.", code: "empty" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "The file is larger than 5 MB. Upload a smaller document or split it into parts.", code: "too_large" }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = normaliseDocumentText(await extractDocumentText(file.name, bytes));
    if (text.length < 20) {
      return Response.json({ error: "The document contains almost no text.", code: "too_short" }, { status: 422 });
    }
    return Response.json({ fileName: file.name, text, stats: computeDocumentStats(text) });
  } catch (error) {
    if (error instanceof DocumentParseError) {
      return Response.json({ error: error.message, code: error.code }, { status: 422 });
    }
    console.error("[parse] unexpected error", error);
    return Response.json({ error: "The document could not be processed.", code: "generic" }, { status: 500 });
  }
}
