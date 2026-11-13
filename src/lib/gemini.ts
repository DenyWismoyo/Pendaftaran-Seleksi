import { getPrimaryAppOrigin } from '@/lib/security';

export const DEFAULT_GEMINI_LITE_MODEL = 'gemini-3.5-flash-lite' as const;

export const ALLOWED_GEMINI_LITE_MODELS = new Set<string>([
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
]);

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiLiteOptions {
  model?: string;
  prompt?: string;
  parts?: GeminiPart[];
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  jsonOutput?: boolean;
}

export function assertLiteModel(rawModel?: string): string {
  const model = (rawModel || DEFAULT_GEMINI_LITE_MODEL).trim();
  if (!model.includes('flash-lite') || !ALLOWED_GEMINI_LITE_MODELS.has(model)) {
    throw new Error(
      `Model "${model}" ditolak. Sistem hanya mengizinkan varian Gemini Flash Lite (default: ${DEFAULT_GEMINI_LITE_MODEL}).`
    );
  }
  return model;
}

export async function callGeminiLite(options: GeminiLiteOptions): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY?.trim() || '';
  if (!apiKey) {
    throw new Error('GOOGLE_AI_STUDIO_API_KEY belum dikonfigurasi di server.');
  }

  const model = assertLiteModel(options.model || process.env.GEMINI_MODEL);
  const parts: GeminiPart[] =
    options.parts && options.parts.length > 0
      ? options.parts
      : options.prompt
        ? [{ text: options.prompt }]
        : [];

  if (parts.length === 0) {
    throw new Error('Prompt atau konten permintaan Gemini tidak boleh kosong.');
  }

  const primaryOrigin = getPrimaryAppOrigin();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28000);

  const payload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 2500,
      ...(options.jsonOutput ? { responseMimeType: 'application/json' } : {}),
    },
  };

  if (options.systemInstruction?.trim()) {
    payload.systemInstruction = {
      parts: [{ text: options.systemInstruction.trim() }],
    };
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
        Origin: primaryOrigin,
        Referer: `${primaryOrigin}/`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Google AI Studio Error (${res.status}): ${errText.slice(0, 220)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || '';

    if (!text) {
      throw new Error('Respons Google AI Studio (Gemini Flash Lite) kosong.');
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export function extractJsonFromAi<T>(rawText: string): T {
  const cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
  }
  return JSON.parse(cleaned) as T;
}

