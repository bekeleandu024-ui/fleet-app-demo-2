"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadTesseract, type TesseractLike } from "@/lib/tesseract-loader";
import {
  parseOcrToOrder,
  type ParsedOrderDraft,
  type ParsedOrderField,
} from "@/lib/ocr";

type Tone = "info" | "success" | "error";

let tesseractModule: Promise<TesseractLike> | null = null;

async function getTesseract() {
  if (!tesseractModule) {
    tesseractModule = loadTesseract();
  }
  return tesseractModule;
}

type StatusState = {
  text: string;
  tone: Tone;
};

type ParsedPayload = {
  ok?: boolean;
  ocrConfidence?: number;
  text?: string;
  parsed?: ParsedOrderDraft;
  warnings?: string[];
  fields?: ParsedOrderField[];
  error?: string;
};

type Props = {
  onParsed: (payload: ParsedPayload) => void;
  actions?: React.ReactNode;
};

function toneClass(tone: Tone) {
  switch (tone) {
    case "success":
      return "text-emerald-400";
    case "error":
      return "text-rose-400";
    default:
      return "text-zinc-300";
  }
}

function StatusMessage({ status }: { status: StatusState }) {
  return <div className={`mt-4 text-sm ${toneClass(status.tone)}`}>{status.text}</div>;
}

export default function OcrDropBox({ onParsed, actions }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<StatusState>({ text: "Waiting for image", tone: "info" });
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImage = useCallback(
    async (file: File) => {
      setBusy(true);
      setProgress(0);
      setStatus({ text: "Running OCR…", tone: "info" });
      const preview = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return preview;
      });

      try {
        const tesseract = await getTesseract();
        const result = await tesseract.recognize(file, "eng", {
          logger: (message) => {
            if (message.progress !== undefined) {
              setProgress(Math.min(100, Math.round(message.progress * 100)));
            }
          },
        });
        const text = result.data.text.trim();
        const confidence = Number(result.data.confidence ?? 0);
        const parsed = parseOcrToOrder(text);
        setStatus({ text: "Text captured. Review and apply fields below.", tone: "success" });
        onParsed({
          ok: true,
          ocrConfidence: confidence,
          text,
          parsed: parsed.parsedOrder,
          warnings: parsed.warnings,
          fields: parsed.fields,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        setStatus({ text: message, tone: "error" });
        onParsed({ ok: false, error: message });
      } finally {
        setBusy(false);
        setProgress(100);
      }
    },
    [onParsed]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((file) => file.type.startsWith("image"));
      if (!list.length) {
        setStatus({ text: "Please use an image file", tone: "error" });
        return;
      }
      void handleImage(list[0]);
    },
    [handleImage]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (busy) return;
      const { files } = event.dataTransfer;
      if (files && files.length) {
        handleFiles(files);
      }
    },
    [busy, handleFiles]
  );

  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      if (busy) return;
      const items = Array.from(event.clipboardData.items);
      const file = items
        .filter((item) => item.type.startsWith("image"))
        .map((item) => item.getAsFile())
        .find(Boolean);
      if (file) {
        event.preventDefault();
        handleFiles([file]);
      }
    },
    [busy, handleFiles]
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/70 p-10 text-center transition hover:border-sky-500 ${busy ? "opacity-70" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={onDrop}
        onPaste={onPaste}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            fileRef.current?.click();
          }
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              handleFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />
        <p className="text-lg font-semibold text-zinc-200">Paste a screenshot here or drag an image file</p>
        <p className="text-sm text-zinc-400">Win+Shift+S → Ctrl+V to paste</p>
        <StatusMessage status={status} />
        {busy && (
          <div className="mt-4 flex w-full max-w-sm flex-col items-center gap-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-zinc-400">{progress}%</span>
          </div>
        )}
        {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
      </div>
      {previewUrl && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="mb-2 text-sm font-semibold text-zinc-300">Preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="OCR preview" className="max-h-96 w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
