import { describe, expect, it } from 'vitest';
import {
  assertLiteModel,
  DEFAULT_GEMINI_LITE_MODEL,
  extractJsonFromAi,
} from '@/lib/gemini';

describe('Google AI Studio Gemini Flash Lite guard', () => {
  it('defaults to gemini-3.5-flash-lite', () => {
    expect(DEFAULT_GEMINI_LITE_MODEL).toBe('gemini-3.5-flash-lite');
    expect(assertLiteModel()).toBe('gemini-3.5-flash-lite');
    expect(assertLiteModel('gemini-3.5-flash-lite')).toBe('gemini-3.5-flash-lite');
  });

  it('rejects any non-lite model', () => {
    expect(() => assertLiteModel('gemini-3.5-flash')).toThrow(/ditolak/i);
    expect(() => assertLiteModel('gemini-2.5-pro')).toThrow(/ditolak/i);
    expect(() => assertLiteModel('clario/deepseek-v4-flash')).toThrow(/ditolak/i);
  });

  it('extracts JSON cleanly from fenced AI responses', () => {
    const raw = '```json\n{"score": 88, "recommendation": "DIREKOMENDASIKAN"}\n```';
    const parsed = extractJsonFromAi<{ score: number; recommendation: string }>(raw);
    expect(parsed.score).toBe(88);
    expect(parsed.recommendation).toBe('DIREKOMENDASIKAN');
  });
});

