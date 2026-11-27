/*
 * ReqWise command-line runner: runs the full agent pipeline on one document and writes the report.
 *
 *   npm run agent -- --input <file> --output <report.md|report.json> [--lang ru|en]
 *
 * No web server is needed. The Gemini key is read from GEMINI_API_KEY (environment, .env.local or .env).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { runPipeline } from "@/agents/pipeline";
import { DocumentParseError, extractDocumentText } from "@/lib/document-parser";
import { computeDocumentStats, normaliseDocumentText } from "@/lib/document-stats";
import { isGeminiConfigured } from "@/lib/gemini";
import { reportStrings } from "@/lib/i18n";
import { reportToMarkdown } from "@/lib/report-markdown";
import { formatDuration } from "@/lib/utils";
import type { PipelineEvent, ReportLanguage } from "@/types";

const USAGE = `ReqWise agent: checks a requirements document and writes a validation report.

Usage:
  npm run agent -- --input <file> --output <report.md|report.json> [--lang ru|en]

Options:
  -i, --input    Requirements document: .md, .txt, .docx or .pdf            (required)
  -o, --output   Report file. Ends with .json for JSON, otherwise Markdown   (default: report.md)
  -l, --lang     Report language: ru or en                                   (default: language of the document)
  -h, --help     Show this help

Example:
  npm run agent -- --input public/samples/spending-limit-srs-ru.md --output report.md --lang ru

Needs GEMINI_API_KEY in the environment or in .env.local (free key: https://aistudio.google.com/apikey).`;

interface Options {
  input?: string;
  output: string;
  lang?: ReportLanguage;
  help: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { output: "report.md", help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, inline] = argv[i].split(/=(.*)/s, 2);
    const value = () => inline ?? argv[++i];
    switch (flag) {
      case "-i":
      case "--input":
        options.input = value();
        break;
      case "-o":
      case "--output":
        options.output = value() ?? options.output;
        break;
      case "-l":
      case "--lang":
      case "--language": {
        const lang = value()?.toLowerCase();
        if (lang !== "ru" && lang !== "en") fail(`--lang must be "ru" or "en", got "${lang ?? ""}".`);
        options.lang = lang as ReportLanguage;
        break;
      }
      case "-h":
      case "--help":
        options.help = true;
        break;
      default:
        // A bare first argument is treated as the input file.
        if (!flag.startsWith("-") && !options.input) options.input = flag;
        else fail(`Unknown option "${flag}". Run with --help to see the options.`);
    }
  }
  return options;
}

/** Loads KEY=VALUE lines from .env.local and .env without overriding variables that are already set. */
function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match || line.trim().startsWith("#")) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (process.env[match[1]] === undefined) process.env[match[1]] = value;
    }
  }
}

function fail(message: string, code = 1): never {
  console.error(`\nError: ${message}`);
  process.exit(code);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }
  if (!options.input) fail(`No input file given.\n\n${USAGE}`);

  loadEnvFiles();
  if (!isGeminiConfigured()) {
    fail("GEMINI_API_KEY is not set. Add it to .env.local or set it in the terminal before running.");
  }

  const inputPath = resolve(process.cwd(), options.input);
  if (!existsSync(inputPath)) fail(`Input file not found: ${inputPath}`);

  let text: string;
  try {
    text = normaliseDocumentText(await extractDocumentText(basename(inputPath), new Uint8Array(readFileSync(inputPath))));
  } catch (error) {
    fail(error instanceof DocumentParseError ? error.message : `Could not read ${inputPath}.`);
  }
  if (text.length < 50) fail("The document has almost no text.");

  const stats = computeDocumentStats(text);
  const language: ReportLanguage = options.lang ?? (stats.language === "ru" ? "ru" : "en");
  const names = reportStrings("en").agents;

  console.log("ReqWise agent");
  console.log(`  Input:    ${options.input} (${stats.words} words, about ${stats.requirements} requirements, ${stats.apiEndpoints} API endpoints)`);
  console.log(`  Report:   ${options.output} (language: ${language})\n`);

  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());

  const onEvent = (event: PipelineEvent) => {
    if (event.type !== "agent") return;
    const name = names[event.agent];
    const time = event.durationMs !== undefined ? ` (${formatDuration(event.durationMs)})` : "";
    const detail = reportStrings("en").describe(event.agent, event.status === "running" ? "done" : event.status, event.metrics ?? {}) ?? event.detail ?? "";
    if (event.status === "running") console.log(`  ...  ${name}`);
    else if (event.status === "done") console.log(`  ok   ${name}${time}: ${detail}`);
    else if (event.status === "skipped") console.log(`  --   ${name}: ${detail || "skipped"}`);
    else console.log(`  !!   ${name}${time}: ${event.detail ?? "failed"}`);
  };

  const started = Date.now();
  const report = await runPipeline({ document: text, fileName: basename(inputPath), language }, { onEvent, signal: controller.signal });

  const outputPath = resolve(process.cwd(), options.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  const asJson = extname(outputPath).toLowerCase() === ".json";
  writeFileSync(outputPath, asJson ? JSON.stringify(report, null, 2) : reportToMarkdown(report), "utf8");

  const t = reportStrings("en");
  const count = (severity: string) => report.findings.filter((f) => f.severity === severity).length;
  console.log(`\nDone in ${formatDuration(Date.now() - started)}.`);
  console.log(`  Quality score: ${report.scores.overall}/100 (${t.verdict[report.scores.verdict]}), risk ${report.scores.risk}/100`);
  console.log(`  Problems: ${report.findings.length} (critical ${count("critical")}, high ${count("high")})`);
  console.log(`  Clarifying questions: ${report.clarifyingQuestions?.length ?? 0}, suggested fixes: ${report.improvements.length}`);
  if (report.warnings.length) console.log(`  Notes: ${report.warnings.join(" ")}`);
  console.log(`  Report saved to ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
});
