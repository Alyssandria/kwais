import type { ReactNode } from 'react';
import type { Note } from './api';

const when = (iso: string) => new Date(iso).toLocaleString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function NoteMeta({ note }: { note: Note }) {
  return (
    <p className="text-[12.5px] text-muted">
      <span className="font-semibold text-ink">{note.author ?? 'A former care team member'}</span> · <time dateTime={note.createdAt}>{when(note.createdAt)}</time>
      {note.edited && <> · edited {when(note.updatedAt)}</>}
    </p>
  );
}

export function NoteItem({ note, actions }: { note: Note; actions?: ReactNode }) {
  return (
    <article aria-label={`Note from ${note.author ?? 'a former care team member'}`} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <NoteMeta note={note} />
        {actions}
      </div>
      <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{note.body}</p>
    </article>
  );
}
