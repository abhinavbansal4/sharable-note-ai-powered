import { NextRequest, NextResponse } from 'next/server';
import { getNoteByPublicSlug } from '@/lib/notes';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = await getNoteByPublicSlug(slug);
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    title: note.title,
    contentJson: JSON.parse(note.contentJson),
  });
}
