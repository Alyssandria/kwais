import { Link } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui';
import { useMyNotes } from './api';
import { NoteMeta } from './NoteItem';

export function CareNotesCard() {
  const notes = useMyNotes().data ?? [];
  const latest = notes[0];
  if (!latest) return null;
  return (
    <Card as="section" aria-labelledby="care-notes-title" tone="mint">
      <CardHeader
        id="care-notes-title"
        title="From your care team"
        action={
          <Link to="/patient/notes" className="text-[13px] font-semibold">
            {notes.length === 1 ? 'Open note' : `All ${notes.length} notes`}
          </Link>
        }
      />
      <NoteMeta note={latest} />
      <p className="mt-1.5 line-clamp-3 text-[14.5px] whitespace-pre-wrap">{latest.body}</p>
    </Card>
  );
}
