import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('../../src/models/privacy.model.js', () => ({
  PrivacyModel: { accountForExport: vi.fn(), recordRequest: vi.fn(), activity: vi.fn(), deleteUser: vi.fn() },
}));
vi.mock('../../src/models/patient-profile.model.js', () => ({ PatientProfileModel: { findIdByUserId: vi.fn() } }));
vi.mock('../../src/models/user.model.js', () => ({ UserModel: { findCredentialsById: vi.fn() } }));
vi.mock('../../src/services/lab.service.js', () => ({ LabService: { list: vi.fn() } }));
vi.mock('../../src/services/audit.service.js', () => ({ AuditService: { record: vi.fn() } }));
vi.mock('../../src/lib/password.js', () => ({ verifyPassword: vi.fn(), hashPassword: vi.fn(), getDummyHash: vi.fn() }));

const { PrivacyService, exportFilename, toPlain } = await import('../../src/services/privacy.service.js');
const { PrivacyModel } = await import('../../src/models/privacy.model.js');
const { PatientProfileModel } = await import('../../src/models/patient-profile.model.js');
const { UserModel } = await import('../../src/models/user.model.js');
const { LabService } = await import('../../src/services/lab.service.js');
const { AuditService } = await import('../../src/services/audit.service.js');
const { verifyPassword } = await import('../../src/lib/password.js');

const meta = { ipHash: 'h', userAgent: 'test' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(PatientProfileModel.findIdByUserId).mockResolvedValue('patient-1');
  vi.mocked(UserModel.findCredentialsById).mockResolvedValue({ id: 'user-1', passwordHash: 'hash' } as never);
});

describe('export helpers', () => {
  it('turns decimals into numbers and dates into ISO strings', () => {
    const out = toPlain({ dailyMax: new Prisma.Decimal('2000.50'), at: new Date('2026-10-20T01:02:03Z'), nested: [{ q: new Prisma.Decimal(1) }] });
    expect(out).toEqual({ dailyMax: 2000.5, at: '2026-10-20T01:02:03.000Z', nested: [{ q: 1 }] });
  });

  it('names the file after the patient code and date', () => {
    expect(exportFilename('KW-000123', new Date('2026-10-20T12:00:00Z'))).toBe('kwais-export-KW-000123-2026-10-20.json');
    expect(exportFilename(null, new Date('2026-10-20T12:00:00Z'))).toBe('kwais-export-account-2026-10-20.json');
  });
});

describe('PrivacyService.exportData', () => {
  it('bundles every section, records the request and audits it', async () => {
    vi.mocked(PrivacyModel.recordRequest).mockResolvedValue({ id: 'req-1' } as never);
    vi.mocked(PrivacyModel.accountForExport).mockResolvedValue({
      id: 'user-1',
      email: 'ana@example.com',
      patientProfile: { id: 'patient-1', patientCode: 'KW-000123', firstName: 'Ana', targets: [{ nutrient: 'sodium' }], meals: [{ id: 'm1' }] },
      consents: [{ consentType: 'terms', granted: true }],
      notifications: [],
      dataRequests: [{ id: 'req-1', type: 'export' }],
    } as never);
    vi.mocked(LabService.list).mockResolvedValue([{ id: 'lab-1', value: 5.6 }] as never);
    vi.mocked(PrivacyModel.activity).mockResolvedValue([]);

    const { filename, body } = await PrivacyService.exportData('user-1', meta, new Date('2026-10-20T00:00:00Z'));

    expect(filename).toBe('kwais-export-KW-000123-2026-10-20.json');
    expect(body).toMatchObject({
      format: 'kwais-export',
      account: { id: 'user-1', email: 'ana@example.com' },
      profile: { patientCode: 'KW-000123', firstName: 'Ana' },
      targets: [{ nutrient: 'sodium' }],
      labs: [{ id: 'lab-1', value: 5.6 }],
      meals: [{ id: 'm1' }],
      consents: [{ consentType: 'terms' }],
      dataRequests: [{ id: 'req-1' }],
    });
    expect((body as { profile: object }).profile).not.toHaveProperty('targets');
    expect(LabService.list).toHaveBeenCalledWith('patient-1');
    expect(PrivacyModel.recordRequest).toHaveBeenCalledWith('user-1', 'export');
    expect(AuditService.record).toHaveBeenCalledWith('export', 'account_data', meta, expect.objectContaining({ actorId: 'user-1', patientId: 'patient-1' }));
  });
});

describe('PrivacyService.activity', () => {
  it('marks who acted and describes the device without exposing raw details', async () => {
    vi.mocked(PrivacyModel.activity).mockResolvedValue([
      { id: 'a1', actorId: 'user-1', actorRole: 'patient', action: 'login', resourceType: 'user', userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/129.0 Safari/537.36', at: new Date('2026-10-20T01:00:00Z') },
      { id: 'a2', actorId: 'doc-1', actorRole: 'doctor', action: 'read', resourceType: 'lab_result', userAgent: null, at: new Date('2026-10-19T01:00:00Z') },
    ]);
    const out = await PrivacyService.activity('user-1', 20);
    expect(PrivacyModel.activity).toHaveBeenCalledWith('user-1', 'patient-1', 20);
    expect(out).toEqual([
      { id: 'a1', action: 'login', resourceType: 'user', at: '2026-10-20T01:00:00.000Z', byYou: true, actorRole: 'patient', device: 'Chrome on Windows' },
      { id: 'a2', action: 'read', resourceType: 'lab_result', at: '2026-10-19T01:00:00.000Z', byYou: false, actorRole: 'doctor', device: null },
    ]);
  });
});

describe('PrivacyService.deleteAccount', () => {
  it('refuses a wrong password and keeps the account', async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    await expect(PrivacyService.deleteAccount('user-1', 'wrong', meta)).rejects.toMatchObject({ status: 400, code: 'invalid_password' });
    expect(PrivacyModel.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes the user and keeps an audit entry', async () => {
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(PrivacyModel.deleteUser).mockResolvedValue({ id: 'user-1' });
    await PrivacyService.deleteAccount('user-1', 'right-password-1', meta);
    expect(PrivacyModel.deleteUser).toHaveBeenCalledWith('user-1');
    expect(AuditService.record).toHaveBeenCalledWith('delete', 'account', meta, expect.objectContaining({ actorId: 'user-1', patientId: 'patient-1' }));
  });
});
