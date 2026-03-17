import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getNoteById, getPublicNoteById } from '@/lib/notes';
import { getSharesByNote } from '@/lib/shares';
import { NoteEditor } from '@/components/NoteEditor';
import { SharePanel } from '@/components/SharePanel';
import { DeleteNoteButton } from '@/components/DeleteNoteButton';
import { OwnerSessionGuard } from '@/components/OwnerSessionGuard';
import Link from 'next/link';

export default async function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/authenticate');

  const { id } = await params;
  const [note, shares] = await Promise.all([
    getNoteById(session.user.id, id),
    getSharesByNote(session.user.id, id),
  ]);

  if (!note) {
    // If this note is public but owned by someone else, redirect to the read-only view.
    const publicNote = await getPublicNoteById(id);
    if (publicNote?.publicSlug) redirect(`/p/${publicNote.publicSlug}`);
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          &larr; Dashboard
        </Link>
        <DeleteNoteButton noteId={id} />
      </div>

      <OwnerSessionGuard ownerUserId={note.userId} />
      <NoteEditor note={note} />

      <div className="mt-10">
        <SharePanel
          noteId={id}
          isPublic={note.isPublic}
          publicSlug={note.publicSlug}
          initialShares={shares}
        />
      </div>
    </div>
  );
}
