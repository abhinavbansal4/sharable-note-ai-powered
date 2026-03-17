'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function NewNoteButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const create = async () => {
    setLoading(true);
    const res = await fetch('/api/notes', { method: 'POST' });
    if (res.ok) {
      const note = await res.json();
      router.push(`/notes/${note.id}`);
    } else {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={create}
      disabled={loading}
      className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {loading ? 'Creating...' : '+ New note'}
    </button>
  );
}
