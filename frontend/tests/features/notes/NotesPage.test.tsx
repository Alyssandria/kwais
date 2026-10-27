import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Note } from '@/features/notes/api';

let notes: Note[] = [];
vi.mock('@/features/notes/api', () => ({ useMyNotes: () => ({ data: notes, isPending: false, isError: false, refetch: vi.fn() }) }));

const { NotesPage } = await import('@/features/notes/NotesPage');
const { CareNotesCard } = await import('@/features/notes/CareNotesCard');

const note = (over: Partial<Note>): Note => ({
  id: 'n1',
  body: 'Keep sodium low this week.\nBring your lab slip.',
  author: 'Dr. Ana Reyes',
  createdAt: '2026-10-26T02:00:00Z',
  updatedAt: '2026-10-26T02:00:00Z',
  edited: false,
  mine: false,
  ...over,
});

const show = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  notes = [];
});

describe('NotesPage', () => {
  it('explains where notes come from when there are none', () => {
    show(<NotesPage />);
    expect(screen.getByText('No notes yet')).toBeInTheDocument();
  });

  it('lists notes with their author, and marks edits and departed authors', () => {
    notes = [note({ edited: true, updatedAt: '2026-10-27T02:00:00Z' }), note({ id: 'n2', author: null, body: 'Older note' })];
    show(<NotesPage />);
    expect(screen.getByRole('article', { name: 'Note from Dr. Ana Reyes' })).toHaveTextContent(/edited/);
    expect(screen.getByRole('article', { name: 'Note from a former care team member' })).toHaveTextContent('Older note');
  });
});

describe('CareNotesCard', () => {
  it('stays hidden until there is a note', () => {
    const { container } = show(<CareNotesCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the newest note and links to all of them', () => {
    notes = [note({}), note({ id: 'n2' })];
    show(<CareNotesCard />);
    expect(screen.getByRole('region', { name: 'From your care team' })).toHaveTextContent('Keep sodium low this week.');
    expect(screen.getByRole('link', { name: 'All 2 notes' })).toHaveAttribute('href', '/patient/notes');
  });
});
