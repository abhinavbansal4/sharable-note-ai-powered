'use client';

import type { Editor } from '@tiptap/react';

type Props = { editor: Editor | null };

export function Toolbar({ editor }: Props) {
  if (!editor) return null;

  const btn = (
    label: string,
    active: boolean,
    onClick: () => void,
  ) => (
    <button
      key={label}
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900'
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1.5 mb-3">
      {btn('Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
      {btn('Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
      {btn('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
      {btn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {btn('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      {btn('Paragraph', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run())}
      {btn('Bullet list', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
      {btn('Inline code', editor.isActive('code'), () => editor.chain().focus().toggleCode().run())}
      {btn('Code block', editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run())}
      {btn('Rule', false, () => editor.chain().focus().setHorizontalRule().run())}
    </div>
  );
}
