export type TesseractLike = {
  recognize: (
    image: string | File | Blob,
    lang?: string,
    options?: { logger?: (m: { progress?: number; status?: string }) => void }
  ) => Promise<{ data: { text: string; confidence: number } }>;
};

async function importTesseract(): Promise<TesseractLike | null> {
  try {
    const moduleName = "tesseract.js";
    const mod = (await import(/* webpackIgnore: true */ moduleName)) as unknown;
    const candidate = (mod as { default?: unknown }).default ?? mod;
    if (candidate && typeof (candidate as TesseractLike).recognize === "function") {
      return candidate as TesseractLike;
    }
  } catch (error) {
    console.warn("Falling back to OCR stub", error);
  }
  return null;
}

export async function loadTesseract(): Promise<TesseractLike> {
  const real = await importTesseract();
  if (real) return real;
  return {
    async recognize() {
      return {
        data: {
          text: "",
          confidence: 0,
        },
      };
    },
  };
}
