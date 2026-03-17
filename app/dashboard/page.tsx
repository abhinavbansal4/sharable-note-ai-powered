import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getNotesByUser, getPublicNotes } from '@/lib/notes';
import { NoteList } from '@/components/NoteList';
import { NewNoteButton } from './NewNoteButton';
import { LocalTime } from '@/components/LocalTime';

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/authenticate');

  const [notes, publicNotes] = await Promise.all([
    getNotesByUser(session.user.id),
    getPublicNotes(session.user.id),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-12">
      <section>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">My Notes</h1>
          <NewNoteButton />
        </div>
        <NoteList notes={notes} />
      </section>

      {publicNotes.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">
            Discover Public Notes
          </h2>
          <ul className="space-y-2">
            {publicNotes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/p/${note.publicSlug}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-medium truncate text-neutral-900 dark:text-white">
                      {note.title || 'Untitled note'}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      by {note.ownerName} · <LocalTime iso={note.updatedAt} relative />
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shrink-0">
                    Public
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
