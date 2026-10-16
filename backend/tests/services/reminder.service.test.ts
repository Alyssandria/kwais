import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/models/patient-profile.model.js', () => ({ PatientProfileModel: { withReminderTime: vi.fn() } }));
vi.mock('../../src/models/notification.model.js', () => ({ NotificationModel: { existsSince: vi.fn(), create: vi.fn() } }));
vi.mock('../../src/models/meal.model.js', () => ({ MealModel: { countSince: vi.fn() } }));
vi.mock('../../src/services/consent.service.js', () => ({ ConsentService: { current: vi.fn() } }));

const { ReminderService } = await import('../../src/services/reminder.service.js');
const { PatientProfileModel } = await import('../../src/models/patient-profile.model.js');
const { NotificationModel } = await import('../../src/models/notification.model.js');
const { MealModel } = await import('../../src/models/meal.model.js');
const { ConsentService } = await import('../../src/services/consent.service.js');

const at7pmManila = new Date('2026-10-16T11:05:00Z');
const consent = (granted: boolean) =>
  ({ reminders: { granted, policyVersion: '2026-10', at: '' }, terms: null, health_data: null, ai_processing: null }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(PatientProfileModel.withReminderTime).mockResolvedValue([{ id: 'p1', userId: 'u1', reminderTime: '19:00', timezone: 'Asia/Manila' }]);
  vi.mocked(NotificationModel.existsSince).mockResolvedValue(false);
  vi.mocked(MealModel.countSince).mockResolvedValue(0);
  vi.mocked(ConsentService.current).mockResolvedValue(consent(true));
});

describe('ReminderService.runDue', () => {
  it('reminds once the patient’s local reminder time has passed and nothing is logged today', async () => {
    expect(await ReminderService.runDue(at7pmManila)).toBe(1);
    expect(NotificationModel.create).toHaveBeenCalledWith('u1', expect.objectContaining({ type: 'meal_reminder', link: '/patient/meals/new' }));
    expect(MealModel.countSince).toHaveBeenCalledWith('p1', new Date('2026-10-15T16:00:00Z'));
  });

  it('waits until the reminder time', async () => {
    expect(await ReminderService.runDue(new Date('2026-10-16T10:55:00Z'))).toBe(0);
  });

  it('skips patients who logged today, were already reminded, or turned reminders off', async () => {
    vi.mocked(MealModel.countSince).mockResolvedValueOnce(1);
    expect(await ReminderService.runDue(at7pmManila)).toBe(0);
    vi.mocked(NotificationModel.existsSince).mockResolvedValueOnce(true);
    expect(await ReminderService.runDue(at7pmManila)).toBe(0);
    vi.mocked(ConsentService.current).mockResolvedValueOnce(consent(false));
    expect(await ReminderService.runDue(at7pmManila)).toBe(0);
    expect(NotificationModel.create).not.toHaveBeenCalled();
  });
});
