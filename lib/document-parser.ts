/*
 * Server-side text extraction for uploaded documents.
 * Parsers are loaded lazily, so plain-text uploads never load the PDF or DOCX libraries.
 */

export const SUPPORTED_EXTENSIONS = ["txt", "md", "markdown", "docx", "pdf"] as const;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type ParseErrorCode = "unsupported" | "legacy_doc" | "scanned_pdf" | "unreadable";

export class DocumentParseError extends Error {
  readonly code: ParseErrorCode;
  constructor(message: string, code: ParseErrorCode) {
    super(message);
    this.name = "DocumentParseError";
    this.code = code;
  }
}

export function fileExtension(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  return match ? match[1].toLowerCase() : "";
}

export async function extractDocumentText(fileName: string, bytes: Uint8Array): Promise<string> {
  const ext = fileExtension(fileName);

  switch (ext) {
    case "txt":
    case "md":
    case "markdown":
      return decodeText(bytes);
    case "docx":
      return extractDocx(bytes);
    case "pdf":
      return extractPdf(bytes);
    case "doc":
      throw new DocumentParseError("Legacy .doc files are not supported. Save the file as .docx or PDF and upload it again.", "legacy_doc");
    default:
      throw new DocumentParseError("Unsupported file type. Upload a .txt, .md, .docx or .pdf file.", "unsupported");
  }
}

/** UTF-8 first; falls back to Windows-1251, which many Russian-language text files still use. */
function decodeText(bytes: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
  const broken = (utf8.match(/�/g) ?? []).length;
  if (broken > 5 && broken / Math.max(1, utf8.length) > 0.001) {
    try {
      return new TextDecoder("windows-1251").decode(bytes);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

interface MammothLike {
  extractRawText(input: { buffer: Buffer }): Promise<{ value: string }>;
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  const mod = (await import("mammoth")) as unknown as MammothLike & { default?: MammothLike };
  const mammoth = mod.default ?? mod;
  try {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value;
  } catch {
    throw new DocumentParseError("This .docx file could not be read. Check that it is not password-protected or corrupted.", "unreadable");
  }
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    const value: string = Array.isArray(text) ? text.join("\n\n") : text;
    if (value.replace(/\s/g, "").length < 20) {
      throw new DocumentParseError("No selectable text was found in this PDF. It may be a scanned image; export it with OCR or upload a .docx instead.", "scanned_pdf");
    }
    return value;
  } catch (error) {
    if (error instanceof DocumentParseError) throw error;
    throw new DocumentParseError("This PDF could not be read. Check that it is not password-protected or corrupted.", "unreadable");
  }
}
