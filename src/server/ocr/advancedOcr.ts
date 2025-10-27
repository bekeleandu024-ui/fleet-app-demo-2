export type OcrResult = {
  text: string;
  confidence: number;
};

function getConfig() {
  const url = process.env.ADVANCED_OCR_URL;
  const key = process.env.ADVANCED_OCR_KEY;

  if (!url || !key) {
    throw new Error("ADVANCED OCR not configured");
  }

  return { url, key };
}

export async function advancedOcrExtract(
  fileBytes: Buffer,
  mimeType: string
): Promise<OcrResult> {
  const { url, key } = getConfig();

  const body = {
    mimeType,
    // TODO: Replace with provider-specific payload format.
    file: fileBytes.toString("base64"),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText ? `Advanced OCR request failed: ${errorText}` : "Advanced OCR request failed"
    );
  }

  const data = (await response.json().catch(() => null)) as
    | { text?: unknown; confidence?: unknown }
    | null;

  if (!data || typeof data.text !== "string") {
    throw new Error("Advanced OCR response missing text");
  }

  const confidence = Number(data.confidence);

  return {
    text: data.text,
    confidence: Number.isFinite(confidence) ? confidence : 0,
  };
}
