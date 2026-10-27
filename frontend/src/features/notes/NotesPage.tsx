import { NotebookPen } from 'lucide-react';
import { Card, EmptyState, ErrorState, LoadingRegion, PageHeader, Skeleton } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useMyNotes } from './api';
import { NoteItem } from './NoteItem';

export function NotesPage() {
  const notes = useMyNotes();
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader title="Notes from your care team" description="Doctors who follow your records can leave you notes here. Newest first." />
      {notes.isPending ? (
        <LoadingRegion label="Loading notes">
          <Skeleton className="h-28 w-full" />
        </LoadingRegion>
      ) : notes.isError ? (
        <Card padding="none">
          <ErrorState title="We couldn’t load your notes" message={errorMessage(notes.error)} onRetry={() => void notes.refetch()} />
        </Card>
      ) : notes.data.length === 0 ? (
        <Card padding="none">
          <EmptyState icon={NotebookPen} title="No notes yet" description="When a doctor on your care team leaves a note, it appears here and you get a notification." />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.data.map((n) => (
            <li key={n.id}>
              <NoteItem note={n} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12.5px] text-muted">Notes are not for emergencies. If you feel unwell, contact your clinic or go to the nearest hospital.</p>
    </div>
  );
}
