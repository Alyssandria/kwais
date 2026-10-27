import { useState, type FormEvent } from 'react';
import { Button, Card, CardHeader, ConfirmDialog, ErrorState, LoadingRegion, Notice, Skeleton, Textarea, useToast } from '@/components/ui';
import type { Note } from '@/features/notes/api';
import { NoteItem } from '@/features/notes/NoteItem';
import { errorMessage } from '@/lib/api';
import { useAddNote, useDeleteNote, useEditNote, usePatientNotes } from './clinical';
import { usePatientRecordContext } from './PatientRecordLayout';

const MAX = 2000;

function Composer({ patientId, name }: { patientId: string; name: string }) {
  const add = useAddNote(patientId);
  const toast = useToast();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return setError('Write the note first');
    setError(null);
    try {
      await add.mutateAsync(body.trim());
      setBody('');
      toast.success(`Note sent to ${name}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Card as="section" aria-labelledby="new-note-title">
      <CardHeader id="new-note-title" title="Write a note" subtitle={`${name} sees it in K-WAIS and gets a notification.`} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <Textarea
          label="Note"
          rows={4}
          maxLength={MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          error={error ?? undefined}
          hint={`${body.length} of ${MAX} characters. Not for urgent matters.`}
        />
        <Button type="submit" className="self-end" loading={add.isPending}>
          Send note
        </Button>
      </form>
    </Card>
  );
}

function Editor({ note, patientId, onDone }: { note: Note; patientId: string; onDone: () => void }) {
  const edit = useEditNote(patientId);
  const [body, setBody] = useState(note.body);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return setError('A note can’t be empty. Delete it instead.');
    try {
      await edit.mutateAsync({ id: note.id, body: body.trim() });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-card border border-primary bg-surface p-4">
      <Textarea label="Edit note" rows={4} maxLength={MAX} value={body} onChange={(e) => setBody(e.target.value)} error={error ?? undefined} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={edit.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

export function NotesTab() {
  const r = usePatientRecordContext();
  const patientId = r.patient.patientId;
  const notes = usePatientNotes(patientId);
  const remove = useDeleteNote(patientId);
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Note deleted');
    } catch (err) {
      toast.error('Couldn’t delete the note', errorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="sr-only">Notes</h2>
      <Composer patientId={patientId} name={r.patient.name} />
      <section aria-labelledby="notes-list-title" className="flex flex-col gap-3">
        <h3 id="notes-list-title" className="text-base font-bold">
          Notes from the care team
        </h3>
        {notes.isPending ? (
          <LoadingRegion label="Loading notes">
            <Skeleton className="h-24 w-full" />
          </LoadingRegion>
        ) : notes.isError ? (
          <Card padding="none">
            <ErrorState title="We couldn’t load the notes" message={errorMessage(notes.error)} onRetry={() => void notes.refetch()} />
          </Card>
        ) : notes.data.length === 0 ? (
          <Notice>No notes yet. Every doctor following this patient sees the notes here.</Notice>
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.data.map((n) => (
              <li key={n.id}>
                {editing === n.id ? (
                  <Editor note={n} patientId={patientId} onDone={() => setEditing(null)} />
                ) : (
                  <NoteItem
                    note={n}
                    actions={
                      n.mine ? (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(n.id)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleting(n)}>
                            Delete
                          </Button>
                        </div>
                      ) : undefined
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <ConfirmDialog
        open={deleting != null}
        title="Delete this note?"
        description="The patient will no longer see it. This can’t be undone."
        confirmLabel="Delete note"
        destructive
        loading={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
