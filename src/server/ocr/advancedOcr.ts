export type OcrResult = {
  text: string;
  confidence: number;
};

export class AdvancedOcrConfigError extends Error {
  constructor(message = "ADVANCED OCR not configured") {
    super(message);
    this.name = "AdvancedOcrConfigError";
  }
}

function getConfig() {
  const url = process.env.ADVANCED_OCR_URL;
  const key = process.env.ADVANCED_OCR_KEY;

  if (!url || !key) {
    throw new AdvancedOcrConfigError();
  }

  return { url, key };
}

const DOCUMENT_INTELLIGENCE_MODEL_ID = "current_ocr";
const DOCUMENT_INTELLIGENCE_API_VERSION = "2024-02-29-preview";
const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 60_000;

type AnalyzeOperationResult = {
  status?: "notStarted" | "running" | "succeeded" | "failed" | "canceled";
  analyzeResult?: {
    content?: unknown;
    pages?: Array<{
      words?: Array<{ confidence?: unknown }>;
    }>;
  };
  error?: { code?: string; message?: string };
};

function buildAnalyzeUrl(endpoint: string) {
  const trimmed = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
  return `${trimmed}/documentintelligence/documentModels/${DOCUMENT_INTELLIGENCE_MODEL_ID}:analyze?api-version=${DOCUMENT_INTELLIGENCE_API_VERSION}`;
}

async function pollForResult(operationUrl: string, key: string): Promise<AnalyzeOperationResult> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const response = await fetch(operationUrl, {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        errorText
          ? `Azure Document Intelligence polling failed: ${errorText}`
          : "Azure Document Intelligence polling failed"
      );
    }

    const data = (await response.json().catch(() => null)) as AnalyzeOperationResult | null;
    if (!data) {
      throw new Error("Azure Document Intelligence returned an empty response");
    }

    if (data.status === "succeeded") {
      return data;
    }

    if (data.status === "failed" || data.status === "canceled") {
      const message = data.error?.message ?? "Azure Document Intelligence analysis failed";
      throw new Error(message);
    }

    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Azure Document Intelligence analysis timed out");
}

function extractConfidence(result: AnalyzeOperationResult): number {
  const pages = Array.isArray(result.analyzeResult?.pages) ? result.analyzeResult?.pages : [];
  const confidences = pages.flatMap((page) =>
    Array.isArray(page.words)
      ? page.words
          .map((word) => Number(word.confidence))
          .filter((value) => Number.isFinite(value))
      : []
  );

  if (!confidences.length) {
    return 0;
  }

  const total = confidences.reduce((sum, value) => sum + value, 0);
  return total / confidences.length;
}

export async function advancedOcrExtract(
  fileBytes: Buffer,
  mimeType: string
): Promise<OcrResult> {
  const { url, key } = getConfig();
  const analyzeUrl = buildAnalyzeUrl(url);

  const response = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": key,
    },
    body: JSON.stringify({
      base64Source: fileBytes.toString("base64"),
      mimeType,
    }),
  });

  if (response.status !== 202 && response.status !== 200) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText
        ? `Azure Document Intelligence request failed: ${errorText}`
        : "Azure Document Intelligence request failed"
    );
  }

  if (response.status === 200) {
    const immediateResult = (await response.json().catch(() => null)) as AnalyzeOperationResult | null;
    if (immediateResult) {
      const textContent =
        typeof immediateResult.analyzeResult?.content === "string"
          ? immediateResult.analyzeResult.content.trim()
          : "";
      if (!textContent) {
        throw new Error("Azure Document Intelligence response missing text content");
      }
      const confidenceImmediate = extractConfidence(immediateResult);
      return {
        text: textContent,
        confidence: confidenceImmediate,
      };
    }
  }

  const operationLocation = response.headers.get("operation-location");
  if (!operationLocation) {
    throw new Error("Azure Document Intelligence response missing operation location");
  }

  const result = await pollForResult(operationLocation, key);
  const text = typeof result.analyzeResult?.content === "string" ? result.analyzeResult.content.trim() : "";

  if (!text) {
    throw new Error("Azure Document Intelligence response missing text content");
  }

  const confidence = extractConfidence(result);

  return {
    text,
    confidence,
  };
}
