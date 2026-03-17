'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

type Props = {
  title: string;
  contentJson: string;
  ownerName: string;
};

export function PublicNoteViewer({ title, contentJson, ownerName }: Props) {
  let parsedContent: object = { type: 'doc', content: [] };
  try {
    const first = JSON.parse(contentJson);
    parsedContent = typeof first === 'string' ? JSON.parse(first) : first;
  } catch {
    // malformed content — render empty
  }

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: parsedContent,
    editable: false,
    immediatelyRender: false,
  });

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2 text-neutral-900 dark:text-white">{title}</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">
        by{' '}
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{ownerName}</span>
      </p>
      <div className="prose dark:prose-invert max-w-none [&_.tiptap]:outline-none
        [&_.tiptap_p]:text-neutral-800 dark:[&_.tiptap_p]:text-neutral-200">
        <EditorContent editor={editor} />
      </div>
    </article>
  );
}
