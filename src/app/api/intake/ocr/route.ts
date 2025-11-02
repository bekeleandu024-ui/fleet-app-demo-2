import { NextResponse } from "next/server";

import { advancedOcrExtract } from "@/server/ocr/advancedOcr";
import { parseStructuredOrder } from "@/server/ocr/parseStructuredOrder";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      throw new Error("File is required");
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const mimeType = (file as File).type || "application/octet-stream";

    const ocr = await advancedOcrExtract(fileBuffer, mimeType);
    const parsed = await parseStructuredOrder(ocr.text);
    const finalConfidence = Math.max(0, Math.min(1, Math.min(ocr.confidence, parsed.confidence)));

    return NextResponse.json({
      ok: true,
      text: ocr.text,
      confidence: finalConfidence,
      parsed: {
        customer: parsed.customer || undefined,
        origin: parsed.origin || undefined,
        destination: parsed.destination || undefined,
        requiredTruck: parsed.requiredTruck || undefined,
        notes: parsed.notes || undefined,
        puWindowStart: parsed.pickupWindowStart || undefined,
        puWindowEnd: parsed.pickupWindowEnd || undefined,
        delWindowStart: parsed.deliveryWindowStart || undefined,
        delWindowEnd: parsed.deliveryWindowEnd || undefined,
      },
      warnings: parsed.warnings ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process OCR intake";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
