import { createWorker } from "tesseract.js";

import type { OcrResult } from "./advancedOcr";

type WorkerInstance = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<WorkerInstance> | undefined;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker();
      await worker.load();
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      return worker;
    })();
  }
  return workerPromise;
}

export async function simpleOcrExtract(fileBytes: Buffer): Promise<OcrResult> {
  const worker = await getWorker();
  const recognition = await worker.recognize(fileBytes);

  const text = typeof recognition.data?.text === "string" ? recognition.data.text.trim() : "";
  const confidenceValue = Number(recognition.data?.confidence);

  if (!text) {
    throw new Error("Basic OCR did not detect any text");
  }

  const confidence = Number.isFinite(confidenceValue)
    ? Math.max(0, Math.min(1, confidenceValue / 100))
    : 0;

  return {
    text,
    confidence,
  };
}

export function resetSimpleOcrWorker() {
  workerPromise = undefined;
}
