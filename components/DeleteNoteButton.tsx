'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteNoteButton({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2" role="dialog" aria-modal="true" aria-label="Confirm delete">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Delete this note? This cannot be undone.</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          autoFocus
          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
    >
      Delete note
    </button>
  );
}
