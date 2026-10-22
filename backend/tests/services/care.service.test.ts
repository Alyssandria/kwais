import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/models/care.model.js', () => ({
  CareModel: {
    doctorByUserId: vi.fn(),
    doctorByEmail: vi.fn(),
    patientByUserId: vi.fn(),
    patientByCode: vi.fn(),
    findOpenBetween: vi.fn(),
    findLink: vi.fn(),
    createLink: vi.fn(),
    updateLink: vi.fn(),
    linksForPatient: vi.fn(),
    linksForDoctor: vi.fn(),
    isActive: vi.fn(),
    createInvite: vi.fn(),
    findInviteByHash: vi.fn(),
    openInvitesForPatient: vi.fn(),
    cancelInvite: vi.fn(),
    markInviteClaimed: vi.fn(),
    claimInvite: vi.fn(),
  },
}));
vi.mock('../../src/models/user.model.js', () => ({ UserModel: { findPublicById: vi.fn(), emailExists: vi.fn() } }));
vi.mock('../../src/models/notification.model.js', () => ({ NotificationModel: { create: vi.fn() } }));
vi.mock('../../src/models/audit.model.js', () => ({ AuditModel: { create: vi.fn() } }));
vi.mock('../../src/services/mail.service.js', () => ({
  MailService: { sendCareRequestToPatient: vi.fn(), sendCareInviteToDoctor: vi.fn(), sendCareInviteToNewDoctor: vi.fn() },
}));

const { CareService, allowedAction } = await import('../../src/services/care.service.js');
const { CareModel } = await import('../../src/models/care.model.js');
const { UserModel } = await import('../../src/models/user.model.js');
const { NotificationModel } = await import('../../src/models/notification.model.js');
const { MailService } = await import('../../src/services/mail.service.js');
const { sha256 } = await import('../../src/lib/tokens.js');

const meta = { ipHash: 'h', userAgent: 'vitest' };
const doctor = { id: 'doc-1', userId: 'du-1', firstName: 'Jose', lastName: 'Reyes', prcLicense: '0123456', specialty: 'Nephrology', clinic: null };
const patient = { id: 'pat-1', userId: 'pu-1', firstName: 'Liza', lastName: 'Santos', patientCode: 'KW-002318', ckdStage: '3b', ckdStageSource: 'patient_entered' as const, dialysisStatus: 'none' as const };
const link = (over: Record<string, unknown> = {}) => ({
  id: 'link-1',
  status: 'pending' as const,
  initiatedBy: 'doctor' as const,
  message: null,
  createdAt: new Date('2026-10-20T00:00:00Z'),
  respondedAt: null,
  endedAt: null,
  endedBy: null,
  doctor,
  patient,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(CareModel.doctorByUserId).mockResolvedValue(doctor);
  vi.mocked(CareModel.patientByUserId).mockResolvedValue(patient);
  vi.mocked(CareModel.findOpenBetween).mockResolvedValue(null);
  vi.mocked(CareModel.createLink).mockImplementation(async (d) => link(d) as never);
  vi.mocked(CareModel.updateLink).mockImplementation(async (id, d) => link({ id, ...d }) as never);
  vi.mocked(UserModel.findPublicById).mockResolvedValue({ email: 'liza@example.com' } as never);
});

describe('allowedAction', () => {
  it.each([
    ['pending', 'doctor', 'patient', 'approve', true],
    ['pending', 'doctor', 'doctor', 'approve', false],
    ['pending', 'doctor', 'doctor', 'cancel', true],
    ['pending', 'doctor', 'patient', 'cancel', false],
    ['pending', 'patient', 'doctor', 'decline', true],
    ['active', 'patient', 'doctor', 'end', true],
    ['active', 'patient', 'patient', 'end', true],
    ['pending', 'patient', 'patient', 'end', false],
    ['declined', 'doctor', 'patient', 'approve', false],
  ] as const)('%s, sent by %s: %s may %s → %s', (status, initiatedBy, party, action, ok) => {
    expect(allowedAction({ status, initiatedBy }, party, action)).toBe(ok);
  });
});

describe('a doctor asking by patient code', () => {
  it('answers the same for a code that does not exist', async () => {
    vi.mocked(CareModel.patientByCode).mockResolvedValue(null);
    await expect(CareService.requestByCode('du-1', 'KW-999999', null, meta)).resolves.toBeUndefined();
    expect(CareModel.createLink).not.toHaveBeenCalled();
  });

  it('creates a pending request and tells the patient in the app and by email', async () => {
    vi.mocked(CareModel.patientByCode).mockResolvedValue(patient);
    await CareService.requestByCode('du-1', 'kw-002318', '  From your check-up  ', meta);
    expect(CareModel.patientByCode).toHaveBeenCalledWith('KW-002318');
    expect(CareModel.createLink).toHaveBeenCalledWith({ patientId: 'pat-1', doctorId: 'doc-1', initiatedBy: 'doctor', message: 'From your check-up' });
    expect(NotificationModel.create).toHaveBeenCalledWith('pu-1', expect.objectContaining({ type: 'care_team', title: 'Dr. Jose Reyes wants to follow your records' }));
    expect(MailService.sendCareRequestToPatient).toHaveBeenCalledWith('liza@example.com', 'Liza', 'Dr. Jose Reyes', 'Nephrology, PRC 0123456', 'From your check-up');
  });

  it('does not repeat a request that is already open', async () => {
    vi.mocked(CareModel.patientByCode).mockResolvedValue(patient);
    vi.mocked(CareModel.findOpenBetween).mockResolvedValue(link());
    await CareService.requestByCode('du-1', 'KW-002318', null, meta);
    expect(CareModel.createLink).not.toHaveBeenCalled();
  });
});

describe('a patient inviting by email', () => {
  it('sends a request to a doctor who already has an account', async () => {
    vi.mocked(CareModel.doctorByEmail).mockResolvedValue(doctor);
    await CareService.inviteByEmail('pu-1', ' Dr.Reyes@Example.com ', null, meta);
    expect(CareModel.doctorByEmail).toHaveBeenCalledWith('dr.reyes@example.com');
    expect(CareModel.createLink).toHaveBeenCalledWith(expect.objectContaining({ initiatedBy: 'patient', doctorId: 'doc-1' }));
    expect(NotificationModel.create).toHaveBeenCalledWith('du-1', expect.objectContaining({ title: 'Liza Santos invited you to follow their records' }));
    expect(MailService.sendCareInviteToDoctor).toHaveBeenCalledWith('dr.reyes@example.com', 'Liza Santos', null);
  });

  it('emails a one-time link to someone without an account, storing only its hash', async () => {
    vi.mocked(CareModel.doctorByEmail).mockResolvedValue(null);
    vi.mocked(UserModel.emailExists).mockResolvedValue(false);
    vi.mocked(CareModel.createInvite).mockResolvedValue({ id: 'inv-1' } as never);
    const now = new Date('2026-10-22T00:00:00Z');
    await CareService.inviteByEmail('pu-1', 'new.doctor@example.com', 'Hi', meta, now);

    const token = vi.mocked(MailService.sendCareInviteToNewDoctor).mock.calls[0]![2];
    const stored = vi.mocked(CareModel.createInvite).mock.calls[0]![0];
    expect(stored.tokenHash).toBe(sha256(token));
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.expiresAt).toEqual(new Date('2026-11-05T00:00:00Z'));
  });

  it('does nothing visible when the email belongs to another patient', async () => {
    vi.mocked(CareModel.doctorByEmail).mockResolvedValue(null);
    vi.mocked(UserModel.emailExists).mockResolvedValue(true);
    await CareService.inviteByEmail('pu-1', 'someone@example.com', null, meta);
    expect(CareModel.createInvite).not.toHaveBeenCalled();
    expect(MailService.sendCareInviteToNewDoctor).not.toHaveBeenCalled();
  });
});

describe('answering and ending', () => {
  it('lets the patient approve a doctor request, and tells the doctor', async () => {
    vi.mocked(CareModel.findLink).mockResolvedValue(link());
    await expect(CareService.act('patient', 'pu-1', 'link-1', 'approve', meta)).resolves.toEqual({ id: 'link-1', status: 'active' });
    expect(CareModel.updateLink).toHaveBeenCalledWith('link-1', expect.objectContaining({ status: 'active', respondedAt: expect.any(Date) }));
    expect(NotificationModel.create).toHaveBeenCalledWith('du-1', expect.objectContaining({ title: 'Liza Santos accepted' }));
  });

  it('refuses to let the sender approve their own request', async () => {
    vi.mocked(CareModel.findLink).mockResolvedValue(link());
    await expect(CareService.act('doctor', 'du-1', 'link-1', 'approve', meta)).rejects.toMatchObject({ status: 409 });
    expect(CareModel.updateLink).not.toHaveBeenCalled();
  });

  it('hides links that belong to someone else', async () => {
    vi.mocked(CareModel.findLink).mockResolvedValue(link({ patient: { ...patient, id: 'someone-else' } }));
    await expect(CareService.act('patient', 'pu-1', 'link-1', 'approve', meta)).rejects.toMatchObject({ status: 404 });
  });

  it('records who ended an active link and tells the other side', async () => {
    vi.mocked(CareModel.findLink).mockResolvedValue(link({ status: 'active' }));
    await CareService.act('doctor', 'du-1', 'link-1', 'end', meta);
    expect(CareModel.updateLink).toHaveBeenCalledWith('link-1', expect.objectContaining({ status: 'ended', endedBy: 'doctor' }));
    expect(NotificationModel.create).toHaveBeenCalledWith('pu-1', expect.objectContaining({ title: 'Dr. Jose Reyes stopped sharing' }));
  });
});

describe('invitation links', () => {
  const invite = (over: Record<string, unknown> = {}) => ({
    id: 'inv-1', patientId: 'pat-1', email: 'new.doctor@example.com', message: null,
    createdAt: new Date('2026-10-20T00:00:00Z'), expiresAt: new Date('2026-11-03T00:00:00Z'), claimedAt: null, cancelledAt: null, patient, ...over,
  });

  it('refuses an expired or used link', async () => {
    vi.mocked(CareModel.findInviteByHash).mockResolvedValue(invite({ expiresAt: new Date('2026-10-21T00:00:00Z') }) as never);
    await expect(CareService.claimInvite('du-1', 'x'.repeat(40), meta, new Date('2026-10-22T00:00:00Z'))).rejects.toMatchObject({ code: 'invite_unavailable' });
    vi.mocked(CareModel.findInviteByHash).mockResolvedValue(invite({ claimedAt: new Date() }) as never);
    await expect(CareService.claimInvite('du-1', 'x'.repeat(40), meta, new Date('2026-10-22T00:00:00Z'))).rejects.toMatchObject({ code: 'invite_unavailable' });
    expect(CareModel.claimInvite).not.toHaveBeenCalled();
  });

  it('starts sharing when a doctor accepts, and tells the patient', async () => {
    vi.mocked(CareModel.findInviteByHash).mockResolvedValue(invite() as never);
    vi.mocked(CareModel.claimInvite).mockResolvedValue(link({ status: 'active', initiatedBy: 'patient' }) as never);
    const out = await CareService.claimInvite('du-1', 'x'.repeat(40), meta, new Date('2026-10-22T00:00:00Z'));
    expect(CareModel.findInviteByHash).toHaveBeenCalledWith(sha256('x'.repeat(40)));
    expect(out.patient).toMatchObject({ name: 'Liza Santos', patientCode: 'KW-002318' });
    expect(NotificationModel.create).toHaveBeenCalledWith('pu-1', expect.objectContaining({ title: 'Dr. Jose Reyes accepted your invitation' }));
  });
});

describe('overviews and access', () => {
  it('shows a doctor only the code of a patient who has not approved yet', async () => {
    vi.mocked(CareModel.linksForDoctor).mockResolvedValue([link(), link({ id: 'link-2', status: 'active', respondedAt: new Date('2026-10-21T00:00:00Z') })]);
    const out = await CareService.forDoctor('du-1');
    expect(out.waiting).toEqual([{ id: 'link-1', patientCode: 'KW-002318', createdAt: '2026-10-20T00:00:00.000Z' }]);
    expect(out.patients[0]).toMatchObject({ id: 'link-2', since: '2026-10-21T00:00:00.000Z', patient: { name: 'Liza Santos' } });
    expect(JSON.stringify(out.waiting)).not.toContain('Liza');
  });

  it('refuses a doctor without an active link', async () => {
    vi.mocked(CareModel.isActive).mockResolvedValue(false);
    await expect(CareService.assertActiveLink('du-1', 'pat-1')).rejects.toMatchObject({ status: 404 });
    vi.mocked(CareModel.isActive).mockResolvedValue(true);
    await expect(CareService.assertActiveLink('du-1', 'pat-1')).resolves.toBeUndefined();
  });
});
