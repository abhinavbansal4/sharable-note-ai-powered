'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useRef, useState } from 'react';
import { Toolbar } from './Toolbar';
import type { Note } from '@/lib/notes';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function formatNoteDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function NoteEditor({ note }: { note: Note }) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const latestTitle = useRef(note.title);
  const latestContentJson = useRef(note.contentJson);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retried = useRef(false);

  const save = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: latestTitle.current,
          contentJson: latestContentJson.current,
        }),
      });
      if (!res.ok) throw new Error();
      retried.current = false;
      setSaveStatus('saved');
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      if (!retried.current) {
        retried.current = true;
        save();
      } else {
        setSaveStatus('error');
      }
    }
  }, [note.id]);

  const scheduleSave = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(save, 800);
  }, [save]);

  let parsedContent: object = { type: 'doc', content: [] };
  try {
    const first = JSON.parse(note.contentJson);
    // Guard against double-stringified content (a known past bug where the PUT
    // route called JSON.stringify on an already-stringified string).
    parsedContent = typeof first === 'string' ? JSON.parse(first) : first;
  } catch {
    // malformed content_json — use empty doc
  }

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: parsedContent,
    editable: true,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      latestContentJson.current = JSON.stringify(editor.getJSON());
      scheduleSave();
    },
  });

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden">
      {/* Title + save status */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <input
            defaultValue={note.title}
            onChange={(e) => {
              latestTitle.current = e.target.value;
              scheduleSave();
            }}
            className="flex-1 text-3xl font-bold bg-transparent outline-none text-neutral-900 dark:text-white placeholder-neutral-300 dark:placeholder-neutral-600"
            placeholder="Untitled note"
            aria-label="Note title"
          />
          {/* Save indicator */}
          <span className="text-xs mt-3 shrink-0">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-500 dark:text-red-400">
                Error{' '}
                <button onClick={save} className="underline hover:text-red-700 dark:hover:text-red-300">
                  Retry
                </button>
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="text-neutral-300 dark:text-neutral-600">Auto-saved</span>
            )}
          </span>
        </div>

        {/* Date + auto-save hint */}
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
          {formatNoteDate(note.createdAt)}
        </p>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-2 border-t border-b border-neutral-100 dark:border-neutral-800">
        <Toolbar editor={editor} />
      </div>

      {/* Editor */}
      <div className="px-6 py-5">
        <EditorContent
          editor={editor}
          className="prose dark:prose-invert max-w-none min-h-64 focus-within:outline-none
            [&_.tiptap]:outline-none [&_.tiptap]:min-h-64
            [&_.tiptap]:text-neutral-900 dark:[&_.tiptap]:text-neutral-100
            [&_.tiptap_p]:text-neutral-800 dark:[&_.tiptap_p]:text-neutral-200
            [&_.tiptap_h1]:text-neutral-900 dark:[&_.tiptap_h1]:text-white
            [&_.tiptap_h2]:text-neutral-900 dark:[&_.tiptap_h2]:text-white
            [&_.tiptap_h3]:text-neutral-900 dark:[&_.tiptap_h3]:text-white
            [&_.tiptap_code]:bg-neutral-100 dark:[&_.tiptap_code]:bg-neutral-800
            [&_.tiptap_pre]:bg-neutral-100 dark:[&_.tiptap_pre]:bg-neutral-800"
        />
      </div>
    </div>
  );
}
