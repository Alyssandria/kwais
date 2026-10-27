import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/models/note.model.js', () => ({ NoteModel: { list: vi.fn(), find: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } }));
vi.mock('../../src/models/audit.model.js', () => ({ AuditModel: { create: vi.fn() } }));

const { NoteService } = await import('../../src/services/note.service.js');
const { NoteModel } = await import('../../src/models/note.model.js');
const { AuditModel } = await import('../../src/models/audit.model.js');

const meta = { ipHash: 'h', userAgent: 'vitest' };
const ana = { userId: 'u-ana', doctorId: 'd-ana', name: 'Dr. Ana Reyes' };
const ben = { userId: 'u-ben', doctorId: 'd-ben', name: 'Dr. Ben Cruz' };
const created = new Date('2026-10-27T01:00:00Z');
const note = (over: Partial<Awaited<ReturnType<typeof NoteModel.find>> & object> = {}) => ({
  id: 'n1',
  patientId: 'p1',
  authorId: 'd-ana',
  body: 'Keep sodium low this week.',
  createdAt: created,
  updatedAt: created,
  author: { firstName: 'Ana', lastName: 'Reyes' },
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('NoteService', () => {
  it('shows the author, whether it was edited, and whether it is the viewer’s own', async () => {
    vi.mocked(NoteModel.list).mockResolvedValue([note(), note({ id: 'n2', authorId: null, author: null, updatedAt: new Date('2026-10-27T05:00:00Z') })]);
    const [mine, other] = await NoteService.list('p1', 'd-ana');
    expect(mine).toMatchObject({ author: 'Dr. Ana Reyes', edited: false, mine: true });
    expect(other).toMatchObject({ author: null, edited: true, mine: false });
    expect((await NoteService.list('p1'))[0]!.mine).toBe(false);
  });

  it('records new notes as the doctor, in the patient’s audit trail', async () => {
    vi.mocked(NoteModel.create).mockResolvedValue(note());
    await NoteService.create('p1', 'Keep sodium low this week.', ana, meta);
    expect(NoteModel.create).toHaveBeenCalledWith('p1', 'd-ana', 'Keep sodium low this week.');
    expect(AuditModel.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', resourceType: 'clinical_note', actorRole: 'doctor', patientId: 'p1' }));
  });

  it('lets only the author edit or delete', async () => {
    vi.mocked(NoteModel.find).mockResolvedValue(note());
    await expect(NoteService.update('p1', 'n1', 'Changed', ben, meta)).rejects.toMatchObject({ status: 403 });
    await expect(NoteService.remove('p1', 'n1', ben, meta)).rejects.toMatchObject({ status: 403 });
    expect(NoteModel.update).not.toHaveBeenCalled();
    expect(NoteModel.delete).not.toHaveBeenCalled();

    vi.mocked(NoteModel.update).mockResolvedValue(note({ body: 'Changed' }));
    await NoteService.update('p1', 'n1', 'Changed', ana, meta);
    await NoteService.remove('p1', 'n1', ana, meta);
    expect(NoteModel.delete).toHaveBeenCalledWith('n1');
  });

  it('answers not found for another patient’s note', async () => {
    vi.mocked(NoteModel.find).mockResolvedValue(null);
    await expect(NoteService.remove('p2', 'n1', ana, meta)).rejects.toMatchObject({ status: 404 });
  });
});
