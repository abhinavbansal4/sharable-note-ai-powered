'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LocalTime } from './LocalTime';

type NoteItem = {
  id: string;
  title: string;
  isPublic: boolean;
  updatedAt: string;
};

type Group = { label: string; notes: NoteItem[] };

function groupNotes(notes: NoteItem[]): Group[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 6 * 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const groups: Group[] = [
    { label: 'Today', notes: [] },
    { label: 'Yesterday', notes: [] },
    { label: 'This Week', notes: [] },
    { label: 'This Month', notes: [] },
    { label: 'Older', notes: [] },
  ];

  for (const note of notes) {
    const d = new Date(note.updatedAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    if (dayStart === todayStart) {
      groups[0].notes.push(note);
    } else if (dayStart === yesterdayStart) {
      groups[1].notes.push(note);
    } else if (d.getTime() >= weekStart) {
      groups[2].notes.push(note);
    } else if (d.getTime() >= monthStart) {
      groups[3].notes.push(note);
    } else {
      groups[4].notes.push(note);
    }
  }

  return groups.filter((g) => g.notes.length > 0);
}

function NoteRow({
  note,
  onDelete,
}: {
  note: NoteItem;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDelete(note.id);
    } else {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <li className="relative group">
      <Link
        href={`/notes/${note.id}`}
        className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        <div className="min-w-0 flex-1 pr-2">
          <p className="font-medium truncate text-neutral-900 dark:text-white">
            {note.title || 'Untitled note'}
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
            <LocalTime iso={note.updatedAt} relative />
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {note.isPublic && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
              Shared
            </span>
          )}

          {confirming ? (
            <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '…' : 'Delete'}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirming(false);
                }}
                className="px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirming(true);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 rounded transition-all"
              aria-label="Delete note"
              title="Delete note"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </Link>
    </li>
  );
}

export function NoteList({ notes: initialNotes }: { notes: NoteItem[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  // null = not yet grouped (SSR / before mount); groups are computed client-side
  // to avoid timezone-based hydration mismatches with the server.
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    setGroups(groupNotes(notes));
  }, [notes]);

  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    router.refresh();
  };

  if (notes.length === 0) {
    return (
      <p className="text-neutral-500 dark:text-neutral-400 py-12 text-center">
        No notes yet. Create your first one.
      </p>
    );
  }

  // Flat list during SSR and initial client render (before useEffect fires)
  if (!groups) {
    return (
      <ul className="space-y-2">
        {notes.map((note) => (
          <NoteRow key={note.id} note={note} onDelete={handleDelete} />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 px-1">
            {group.label}
          </h2>
          <ul className="space-y-2">
            {group.notes.map((note) => (
              <NoteRow key={note.id} note={note} onDelete={handleDelete} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
