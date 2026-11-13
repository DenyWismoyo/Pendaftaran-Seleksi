export const CLARIO_MODELS = {
  FAST_REASONING: 'clario/deepseek-v4-flash',
  CHAT_FAST: 'clario/qwen3.8-27b',
} as const;

interface ClarioMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ClarioChatOptions {
  model?: string;
  messages: ClarioMessage[];
  temperature?: number;
  maxTokens?: number;
}

function getClarioConfig() {
  const apiKey = process.env.CLARIO_API_KEY || '';
  const primaryUrl = (
    process.env.CLARIO_BASE_URL || 'https://clario.apicloud.my.id/v1'
  ).replace(/\/+$/, '');
  const backupUrl = (process.env.CLARIO_BACKUP_BASE_URL || '').replace(/\/+$/, '');
  return { apiKey, primaryUrl, backupUrl };
}

async function sendClarioRequest(
  baseUrl: string,
  apiKey: string,
  options: ClarioChatOptions
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || CLARIO_MODELS.FAST_REASONING,
        messages: options.messages,
        temperature: options.temperature ?? 0.25,
        max_tokens: options.maxTokens ?? 3000,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Clario API Error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Respons Clario AI kosong');
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callClarioChat(options: ClarioChatOptions): Promise<string> {
  const { apiKey, primaryUrl, backupUrl } = getClarioConfig();
  if (!apiKey) {
    throw new Error('CLARIO_API_KEY belum dikonfigurasi di .env.local');
  }

  try {
    return await sendClarioRequest(primaryUrl, apiKey, options);
  } catch (primaryErr) {
    if (backupUrl && backupUrl !== primaryUrl) {
      return await sendClarioRequest(backupUrl, apiKey, options);
    }
    throw primaryErr;
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
