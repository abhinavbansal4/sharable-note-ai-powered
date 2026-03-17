import { notFound } from 'next/navigation';
import { getNoteByPublicSlug } from '@/lib/notes';
import { PublicNoteViewer } from '@/components/PublicNoteViewer';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const note = await getNoteByPublicSlug(slug);
  return { title: note ? note.title : 'Note not found' };
}

export default async function PublicNoteViewerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = await getNoteByPublicSlug(slug);
  if (!note) notFound();

  return <PublicNoteViewer title={note.title} contentJson={note.contentJson} ownerName={note.ownerName} />;
}
