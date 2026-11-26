"use client";

import { useRef, useState } from "react";
import { FileText, LoaderCircle, Upload } from "lucide-react";
import { useUi } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = ".txt,.md,.markdown,.docx,.pdf";

interface UploadZoneProps {
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onPaste: (text: string) => void;
  onSample: (language: "en" | "ru") => void;
}

export function UploadZone({ busy, error, onFile, onPaste, onSample }: UploadZoneProps) {
  const { t } = useUi();
  const u = t.upload;
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasted, setPasted] = useState("");

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  if (pasteMode) {
    return (
      <div className="panel p-5">
        <label htmlFor="paste" className="text-[15px] font-semibold text-fg">
          {u.pasteTitle}
        </label>
        <textarea
          id="paste"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={14}
          placeholder={u.pastePlaceholder}
          className="doc-text mt-3 w-full resize-y rounded-xl border border-line bg-ink/60 p-4 text-[0.95rem] outline-none placeholder:text-fg-subtle focus:border-primary/60"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => onPaste(pasted)} disabled={pasted.trim().length < 50}>
            {u.usePasted}
          </Button>
          <Button variant="ghost" onClick={() => setPasteMode(false)}>
            {u.back}
          </Button>
        </div>
        {pasted.trim().length > 0 && pasted.trim().length < 50 ? <p className="mt-2 text-sm text-fg-subtle">{u.minChars}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "panel flex min-h-[340px] flex-col items-center justify-center gap-4 border-dashed px-6 py-12 text-center transition-colors",
          dragging && "border-primary bg-primary/[0.06]",
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          {busy ? <LoaderCircle aria-hidden className="size-6 animate-spin" /> : <Upload aria-hidden className="size-6" />}
        </div>
        <div>
          <p className="text-lg font-medium text-fg">{busy ? u.reading : u.drop}</p>
          <p className="mt-1 text-sm text-fg-muted">{u.formats}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => inputRef.current?.click()} disabled={busy}>
            <FileText aria-hidden className="size-4" />
            {u.choose}
          </Button>
          <Button variant="secondary" onClick={() => setPasteMode(true)} disabled={busy}>
            {u.paste}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {error ? (
          <p role="alert" className="max-w-md rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg">
            {error}
          </p>
        ) : null}
      </div>

      <div className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-fg">{u.noDoc}</p>
          <p className="text-sm text-fg-muted">{u.noDocText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onSample("en")} disabled={busy}>
            {u.sampleEn}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onSample("ru")} disabled={busy}>
            {u.sampleRu}
          </Button>
        </div>
      </div>
    </div>
  );
}
