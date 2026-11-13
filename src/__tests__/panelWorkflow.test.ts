import { describe, expect, it } from 'vitest';
import {
  computeWeightedStageScore,
  DEFAULT_SCORING_CRITERIA,
  resolveCurrentStageIndex,
  resolveFormStages,
  resolveStageCriteria,
  STAGE_PRESETS,
} from '@/lib/selectionStages';
import {
  decryptAccessCode,
  encryptAccessCode,
  generatePanelAccessCode,
  hashAccessCode,
  maskAccessCode,
  normalizeAccessCode,
  signPanelSessionToken,
  verifyPanelSessionToken,
} from '@/lib/panelAuth';
import {
  CreatePanelAccessBatchSchema,
  PanelSubmitScoreSchema,
} from '@/types/selection';

describe('Customizable Selection Stages & Weighted Scoring', () => {
  it('provides 3 distinct built-in stage presets', () => {
    expect(STAGE_PRESETS.rekrutmen.stages.length).toBe(5);
    expect(STAGE_PRESETS.jabatan.stages.length).toBe(5);
    expect(STAGE_PRESETS.vokasi.stages.length).toBe(3);
  });

  it('resolves custom stages ordered ascending and defaults to jabatan preset', () => {
    const fallback = resolveFormStages(undefined);
    expect(fallback).toHaveLength(5);

    const custom = resolveFormStages({
      selectionStages: [
        { id: 'b', order: 2, name: 'Tahap Dua', description: '', requiresScoring: true, isFinalStage: true },
        { id: 'a', order: 1, name: 'Tahap Satu', description: '', requiresScoring: false, isFinalStage: false },
      ],
    });
    expect(custom[0].id).toBe('a');
    expect(custom[1].id).toBe('b');
  });

  it('computes weighted stage score accurately across criteria', () => {
    const score = computeWeightedStageScore(DEFAULT_SCORING_CRITERIA, {
      administrasi: 80,
      rekam_jejak: 90,
      kompetensi: 70,
      wawancara: 100,
    });
    expect(score).toBe(85);
  });

  it('clamps out-of-range criteria values and falls back to form scoringCriteria', () => {
    const criteria = resolveStageCriteria({
      scoringCriteria: [
        { id: 'teknis', label: 'Tes Teknis', weight: 70, maxScore: 100 },
        { id: 'sikap', label: 'Sikap', weight: 30, maxScore: 100 },
      ],
    });
    expect(criteria).toHaveLength(2);
    const total = computeWeightedStageScore(criteria, {
      teknis: 120, // clamped to 100
      sikap: 50,
    });
    expect(total).toBe(85);
  });

  it('resolves explicit currentStageId first before status inference', () => {
    const stages = STAGE_PRESETS.rekrutmen.stages;
    const explicitIdx = resolveCurrentStageIndex(
      { status: 'SUBMITTED', currentStageId: 'tes_teknis' },
      stages
    );
    expect(explicitIdx).toBe(2);

    const inferredIdx = resolveCurrentStageIndex(
      { status: 'INTERVIEW', currentStageId: undefined },
      stages
    );
    expect(inferredIdx).toBe(3);
  });
});

describe('Panel Access Codes, Encryption, & Signed Session Tokens', () => {
  it('generates KND-XXXX-XXXX access codes, hashes consistently, and round-trips AES encryption', () => {
    const code = generatePanelAccessCode();
    expect(code).toMatch(/^KND-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(maskAccessCode(code)).toMatch(/^KND-••••-[A-Z0-9]{4}$/);

    const h1 = hashAccessCode(code.toLowerCase());
    const h2 = hashAccessCode(` ${code} `);
    expect(h1).toBe(h2);
    expect(normalizeAccessCode(` knd-ab12-cd34 `)).toBe('KND-AB12-CD34');

    const encrypted = encryptAccessCode(code);
    expect(encrypted).not.toContain(code);
    expect(decryptAccessCode(encrypted)).toBe(code);
  });

  it('signs and verifies HMAC panelist session token and rejects tampering', () => {
    const token = signPanelSessionToken({
      panelistId: 'panel-1',
      name: 'Budi Santoso',
      roleTitle: 'Ketua Penguji',
      formIds: ['form-abc'],
      isAllForms: false,
      allowedStageIds: ['wawancara_panel'],
      permissions: {
        canScore: true,
        canAdvanceStage: true,
        canViewFiles: true,
      },
    });

    const decoded = verifyPanelSessionToken(token);
    expect(decoded?.panelistId).toBe('panel-1');
    expect(decoded?.name).toBe('Budi Santoso');
    expect(decoded?.permissions.canAdvanceStage).toBe(true);

    const tampered = `${token.slice(0, -3)}XYZ`;
    expect(verifyPanelSessionToken(tampered)).toBeNull();
  });

  it('allows up to 10 panelists per batch and rejects > 10 panelists', () => {
    const tenMembers = Array.from({ length: 10 }, (_, idx) => ({
      name: `Panitia ${idx + 1}`,
      roleTitle: 'Penguji',
    }));

    const okTen = CreatePanelAccessBatchSchema.safeParse({
      members: tenMembers,
      formIds: ['form-1'],
      isAllForms: false,
    });
    expect(okTen.success).toBe(true);

    const elevenMembers = [...tenMembers, { name: 'Panitia 11' }];
    const failEleven = CreatePanelAccessBatchSchema.safeParse({
      members: elevenMembers,
      formIds: ['form-1'],
      isAllForms: false,
    });
    expect(failEleven.success).toBe(false);
  });

  it('validates panel score submission payload', () => {
    const valid = PanelSubmitScoreSchema.safeParse({
      submissionId: 'sub-1',
      stageId: 'uji_gagasan',
      criteriaScores: { administrasi: 85, rekam_jejak: 90 },
      recommendation: 'LAYAK_LANJUT',
      note: 'Kandidat kuat',
    });
    expect(valid.success).toBe(true);
  });
});

