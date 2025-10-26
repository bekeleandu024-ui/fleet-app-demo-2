"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import { parseOcrToOrder, type ParsedOrder } from "@/lib/ocr";

export type OcrResult = {
  ok?: boolean;
  ocrConfidence?: number;
  text?: string;
  parsed?: ParsedOrder;
  error?: string;
};

// Minimal shape we need from tesseract.js
type TesseractLike = {
  recognize: (
    image: any,
    lang: string,
    opts?: { logger?: (m: any) => void }
  ) => Promise<{ data: { text?: string; confidence?: number } }>;
};

let tesseractPromise: Promise<TesseractLike> | null = null;
async function loadTesseract(): Promise<TesseractLike> {
  if (!tesseractPromise) {
    tesseractPromise = import("tesseract.js").then(
      (m) => ((m as any).default ?? (m as any)) as TesseractLike,
    );
  }
  return tesseractPromise;
}

const toneClass = {
  info: "text-gray-500",
  error: "text-red-600",
  success: "text-green-600",
} as const;
type StatusTone = keyof typeof toneClass;

export default function OcrDropBox({
  onParsed,
  actions,
}: {
  onParsed: (r: OcrResult) => void;
  actions?: ReactNode;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const [progress, setProgress] = useState(0);
  const previewUrl = useRef<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      if (busy) return;
      setBusy(true);
      setStatus("Loading OCR engine…");
      setStatusTone("info");
      setProgress(0);
      const url = URL.createObjectURL(file);
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = url;
      setPreview(url);
      try {
        const tesseract = await loadTesseract();
        const { data } = await tesseract.recognize(file, "eng", {
          logger: (m: any) => {
            if (!m?.status) return;
            setStatusTone("info");
            if (m.status === "recognizing text") {
              const progressValue = Math.round((m.progress ?? 0) * 100);
              setProgress(m.progress ?? 0);
              setStatus(`Reading text… ${progressValue}%`);
            } else {
              setStatus(`${m.status[0].toUpperCase()}${m.status.slice(1)}…`);
            }
          },
        });
        const text = data.text ?? "";
        const parsed = parseOcrToOrder(text);
        onParsed({ ok: true, ocrConfidence: data.confidence, text, parsed });
        setProgress(1);
        setStatus("Text captured from image.");
        setStatusTone("success");
      } catch (e: any) {
        const message = e?.message || "OCR failed";
        onParsed({ ok: false, error: message });
        setStatus(message);
        setStatusTone("error");
        setProgress(0);
      } finally {
        setBusy(false);
      }
    },
    [busy, onParsed],
  );

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = e.clipboardData?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        e.preventDefault();
        upload(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [upload]);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (busy) return;
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        upload(file);
      }
    },
    [upload, busy],
  );

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-sm text-slate-600"
      aria-busy={busy}
      role="region"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium text-slate-800">Paste or drop an order screenshot</div>
          <div>
            • Press <kbd>PrtScn</kbd> / <kbd>Win+Shift+S</kbd> then <kbd>Ctrl+V</kbd> here
            <br />• or drag an image file onto this box
          </div>
        </div>
        {(actions || busy) && (
          <div className="flex items-center gap-3 text-sm">
            {actions}
            {busy && (
              <div className="flex items-center gap-2 text-slate-500" aria-live="polite">
                <span
                  className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-400"
                  aria-hidden
                />
                <span>{status ?? "Reading…"}</span>
              </div>
            )}
          </div>
        )}
      </div>
      {status && (
        <div className={`mt-3 text-sm ${toneClass[statusTone]}`} aria-live="polite">
          {status}
          {busy && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded bg-slate-200">
              <div
                className="h-full rounded bg-blue-500 transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, Math.round((progress || 0) * 100)))}%`,
                }}
              />
            </div>
          )}
        </div>
      )}
      {preview && (
        <div className="mt-3">
          <div className="mb-1 text-xs text-slate-500">Preview</div>
          <img src={preview} alt="preview" className="max-h-48 rounded border border-slate-300" />
        </div>
      )}
    </div>
  );
}
