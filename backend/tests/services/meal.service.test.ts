import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testCatalog } from '../fixtures/food-catalog.js';
import type { AnalysisRecord, MealRecord } from '../../src/models/meal.model.js';

vi.mock('../../src/models/meal.model.js', () => ({
  MealModel: {
    create: vi.fn(),
    findOwned: vi.fn(),
    list: vi.fn(),
    recentSaved: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    saveAnalysis: vi.fn(),
    earlierAnalysedTotals: vi.fn(),
  },
}));
vi.mock('../../src/services/food.service.js', () => ({ FoodService: { catalog: vi.fn() } }));
vi.mock('../../src/models/audit.model.js', () => ({ AuditModel: { create: vi.fn() } }));
vi.mock('../../src/services/consent.service.js', () => ({ ConsentService: { hasAiConsent: vi.fn() } }));
vi.mock('../../src/services/profile.service.js', () => ({ ProfileService: { get: vi.fn() } }));
vi.mock('../../src/services/target.service.js', () => ({ TargetService: { listActive: vi.fn() } }));
vi.mock('../../src/services/lab.service.js', () => ({ LabService: { list: vi.fn() } }));

const { MealService } = await import('../../src/services/meal.service.js');
const { MealModel } = await import('../../src/models/meal.model.js');
const { FoodService } = await import('../../src/services/food.service.js');
const { AuditModel } = await import('../../src/models/audit.model.js');
const { ConsentService } = await import('../../src/services/consent.service.js');
const { ProfileService } = await import('../../src/services/profile.service.js');
const { TargetService } = await import('../../src/services/target.service.js');
const { LabService } = await import('../../src/services/lab.service.js');
const { setAiProviderForTests } = await import('../../src/services/ai/ai.service.js');
const { createMockProvider } = await import('../../src/services/ai/mock.provider.js');
const { AiError } = await import('../../src/services/ai/types.js');

const meta = { ipHash: 'h', userAgent: 'vitest' };
const at = new Date('2026-10-16T04:30:00Z');

function mealRow(over: Partial<MealRecord> = {}): MealRecord {
  return {
    id: 'meal-1',
    eatenAt: at,
    category: 'lunch',
    rawText: '1 tasa kanin',
    drinks: [],
    cookingMethods: [],
    notes: null,
    status: 'saved',
    createdAt: at,
    updatedAt: at,
    condiments: [],
    analyses: [],
    ...over,
  };
}

const body = {
  category: 'lunch' as const,
  eatenAt: at,
  rawText: '1 tasa kanin',
  condiments: [{ name: 'patis' as const, amount: 'tsp' as const }],
  drinks: ['tubig' as const],
  cookingMethods: [],
  notes: '',
  status: 'saved' as const,
  analyse: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  setAiProviderForTests(null);
  vi.mocked(FoodService.catalog).mockResolvedValue(testCatalog());
  vi.mocked(ConsentService.hasAiConsent).mockResolvedValue(false);
  vi.mocked(MealModel.earlierAnalysedTotals).mockResolvedValue([]);
  vi.mocked(ProfileService.get).mockResolvedValue({
    patientCode: 'KW-000123',
    firstName: 'Maria',
    lastName: 'Santos',
    birthYear: 1970,
    sex: 'female',
    dietaryPreferences: [],
    allergies: [],
    restrictions: ['Low-salt diet'],
    ckdStage: null,
    dialysisStatus: 'unknown',
    reminderTime: null,
    timezone: 'Asia/Manila',
    onboarding: { step: 5, complete: true },
    updatedAt: '',
  });
  vi.mocked(TargetService.listActive).mockResolvedValue([
    { nutrient: 'sodium', dailyMax: 2000, unit: 'mg', source: 'patient_entered', note: null, since: '' },
  ]);
  vi.mocked(LabService.list).mockResolvedValue([]);
});

describe('MealService.create', () => {
  it('saves a draft without analysing it', async () => {
    vi.mocked(MealModel.create).mockResolvedValue(mealRow({ status: 'draft', rawText: '' }));
    const view = await MealService.create('patient-1', { ...body, rawText: '', status: 'draft', analyse: true }, 'user-1', meta);
    expect(view.status).toBe('draft');
    expect(MealModel.saveAnalysis).not.toHaveBeenCalled();
    expect(AuditModel.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', resourceType: 'meal', patientId: 'patient-1' }));
  });

  it('saves without analysis when the switch is off', async () => {
    vi.mocked(MealModel.create).mockResolvedValue(mealRow());
    await MealService.create('patient-1', { ...body, analyse: false }, 'user-1', meta);
    expect(MealModel.saveAnalysis).not.toHaveBeenCalled();
    expect(MealModel.create).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({ rawText: '1 tasa kanin', status: 'saved', notes: null }),
      [{ name: 'patis', amount: 'tsp' }],
    );
  });

  it('without AI consent, reads the text with rules and sends nothing to AI', async () => {
    const saved = mealRow({ condiments: [{ name: 'patis', amount: 'tsp' }], drinks: ['tubig'] });
    vi.mocked(MealModel.create).mockResolvedValue(saved);
    vi.mocked(MealModel.findOwned).mockResolvedValue({ ...saved, status: 'analysed' });

    await MealService.create('patient-1', body, 'user-1', meta);

    const [mealId, patientId, analysis, items] = vi.mocked(MealModel.saveAnalysis).mock.calls[0]!;
    expect([mealId, patientId]).toEqual(['meal-1', 'patient-1']);
    expect((analysis.totals as { sodium: { value: number } }).sodium.value).toBeCloseTo(403.2);
    expect(analysis).toMatchObject({ score: null, scoreBand: null, aiOutput: null, aiStatus: 'unavailable', model: null });
    expect(analysis.inputsSnapshot).toMatchObject({ parser: 'rules@1', parseSentToAi: null, analysisSentToAi: null, aiSkipped: 'no_consent' });
    expect(items.map((i) => [i.foodItemId, i.label, i.grams])).toEqual([
      ['kanin', 'kanin', 160],
      ['patis', 'patis', 5],
      ['tubig', 'tubig', 240],
    ]);
    expect(AuditModel.create).not.toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'ai_processing' }));
  });

  it('with consent, stores the AI analysis, its score and exactly what was sent', async () => {
    vi.mocked(ConsentService.hasAiConsent).mockResolvedValue(true);
    vi.mocked(MealModel.earlierAnalysedTotals).mockResolvedValue([
      { sodium: { value: 1800 }, potassium: { value: 400 }, phosphorus: { value: 300 }, protein: { value: 20 } },
    ]);
    const saved = mealRow({ condiments: [{ name: 'patis', amount: 'tsp' }] });
    vi.mocked(MealModel.create).mockResolvedValue(saved);
    vi.mocked(MealModel.findOwned).mockResolvedValue({ ...saved, status: 'analysed' });

    await MealService.create('patient-1', body, 'user-1', meta);

    const analysis = vi.mocked(MealModel.saveAnalysis).mock.calls[0]![2];
    // 1800 earlier + 403.2 now > 2000 target: −2; low-salt diet with patis: −2
    expect(analysis).toMatchObject({ aiStatus: 'mock', score: 6, scoreBand: 'mixed', promptVersion: 'v1', model: 'mock-rules' });
    const snap = analysis.inputsSnapshot as Record<string, any>;
    expect(snap.day).toMatchObject({ earlierMeals: 1, totalsWithMeal: { sodium: 2203.2 } });
    expect(snap.analysisSentToAi.allowedInputs).toEqual(['meal', 'day', 'target.sodium', 'restrictions']);
    expect(JSON.stringify(snap.analysisSentToAi)).not.toMatch(/Maria|Santos|KW-000123|1970/);
    expect(AuditModel.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'read', resourceType: 'ai_processing' }));
  });

  it('keeps the nutrient estimate when the AI fails', async () => {
    vi.mocked(ConsentService.hasAiConsent).mockResolvedValue(true);
    const failing = createMockProvider();
    failing.analyseMeal = vi.fn().mockRejectedValue(new AiError('timeout', 'slow'));
    failing.parseMeal = vi.fn().mockRejectedValue(new AiError('http', 'down'));
    setAiProviderForTests(failing);
    vi.mocked(MealModel.create).mockResolvedValue(mealRow());
    vi.mocked(MealModel.findOwned).mockResolvedValue(mealRow({ status: 'analysed' }));

    await MealService.create('patient-1', body, 'user-1', meta);

    const analysis = vi.mocked(MealModel.saveAnalysis).mock.calls[0]![2];
    expect((analysis.totals as { sodium: { value: number } }).sodium.value).toBeCloseTo(3.2);
    expect(analysis).toMatchObject({ aiStatus: 'unavailable', score: null, aiOutput: null });
    expect(analysis.inputsSnapshot).toMatchObject({ parser: 'rules@1', parseError: 'down', aiSkipped: 'ai_error', aiError: 'slow' });
  });
});

describe('MealService.update', () => {
  it('refuses to edit a saved meal', async () => {
    vi.mocked(MealModel.findOwned).mockResolvedValue(mealRow({ status: 'analysed' }));
    await expect(MealService.update('patient-1', 'meal-1', { rawText: 'x' }, 'user-1', meta)).rejects.toMatchObject({ status: 409 });
    expect(MealModel.update).not.toHaveBeenCalled();
  });

  it('needs food text before a draft can be saved', async () => {
    vi.mocked(MealModel.findOwned).mockResolvedValue(mealRow({ status: 'draft', rawText: '' }));
    await expect(MealService.update('patient-1', 'meal-1', { status: 'saved' }, 'user-1', meta)).rejects.toMatchObject({
      status: 400,
      message: 'Tell us what you ate',
    });
  });

  it('changes only the fields sent, and replaces condiments when given', async () => {
    vi.mocked(MealModel.findOwned).mockResolvedValue(mealRow({ status: 'draft' }));
    vi.mocked(MealModel.update).mockResolvedValue(mealRow({ status: 'draft' }));
    await MealService.update('patient-1', 'meal-1', { notes: 'shared', condiments: [] }, 'user-1', meta);
    expect(MealModel.update).toHaveBeenCalledWith('meal-1', { notes: 'shared' }, []);
  });

  it('finishes and analyses a draft', async () => {
    vi.mocked(MealModel.findOwned).mockResolvedValue(mealRow({ status: 'draft' }));
    vi.mocked(MealModel.update).mockResolvedValue(mealRow({ status: 'saved' }));
    await MealService.update('patient-1', 'meal-1', { status: 'saved', analyse: true }, 'user-1', meta);
    expect(MealModel.saveAnalysis).toHaveBeenCalledOnce();
  });
});

describe('MealService.analyse and ownership', () => {
  it('does not analyse drafts', async () => {
    vi.mocked(MealModel.findOwned).mockResolvedValue(mealRow({ status: 'draft' }));
    await expect(MealService.analyse('patient-1', 'meal-1', 'user-1', meta)).rejects.toMatchObject({ status: 409 });
  });

  it('treats another patient’s meal as not found', async () => {
    vi.mocked(MealModel.findOwned).mockResolvedValue(null);
    await expect(MealService.get('patient-2', 'meal-1')).rejects.toMatchObject({ status: 404 });
    await expect(MealService.remove('patient-2', 'meal-1', 'user-2', meta)).rejects.toMatchObject({ status: 404 });
    expect(MealModel.softDelete).not.toHaveBeenCalled();
    expect(MealModel.findOwned).toHaveBeenCalledWith('patient-2', 'meal-1');
  });

  it('returns the latest analysis with its items and notes', async () => {
    const analysis: AnalysisRecord = {
      id: 'a2',
      version: 2,
      engineVersion: 'nutrition-engine@1',
      promptVersion: null,
      model: null,
      totals: { sodium: { value: 3.2, unit: 'mg', source: 'verified', complete: true } },
      itemBreakdown: { items: [{ label: 'kanin' }], notes: [] },
      inputsSnapshot: { parser: 'rules@1', aiSkipped: 'no_consent' },
      score: null,
      scoreBand: null,
      aiOutput: null,
      aiStatus: 'unavailable',
      createdAt: at,
    };
    vi.mocked(MealModel.findOwned).mockResolvedValue(mealRow({ status: 'analysed', analyses: [analysis] }));
    const view = await MealService.get('patient-1', 'meal-1');
    expect(view.analysis).toMatchObject({ version: 2, items: [{ label: 'kanin' }], notes: [], ai: { status: 'unavailable', reason: 'no_consent', output: null } });
    expect(view.eatenAt).toBe('2026-10-16T04:30:00.000Z');
  });
});

describe('MealService.recent', () => {
  it('lists each meal text once, newest first, skipping blanks', async () => {
    vi.mocked(MealModel.recentSaved).mockResolvedValue([
      mealRow({ id: 'm3', rawText: '2 pandesal' }),
      mealRow({ id: 'm2', rawText: '  2  Pandesal ' }),
      mealRow({ id: 'm1', rawText: '' }),
      mealRow({ id: 'm0', rawText: 'Sinigang na baboy', condiments: [{ name: 'patis', amount: 'tsp' }] }),
    ]);
    const recent = await MealService.recent('patient-1');
    expect(recent.map((r) => r.mealId)).toEqual(['m3', 'm0']);
    expect(recent[1]!.condiments).toEqual([{ name: 'patis', amount: 'tsp' }]);
  });
});

describe('MealService.remove', () => {
  it('hides the meal and records it', async () => {
    vi.mocked(MealModel.findOwned).mockResolvedValue(mealRow());
    await MealService.remove('patient-1', 'meal-1', 'user-1', meta);
    expect(MealModel.softDelete).toHaveBeenCalledWith('meal-1');
    expect(AuditModel.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', resourceType: 'meal' }));
  });
});
