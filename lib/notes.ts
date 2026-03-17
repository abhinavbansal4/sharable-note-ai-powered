import { nanoid } from "nanoid";
import { query, get, run } from "./db";

export type Note = {
  id: string;
  userId: string;
  title: string;
  contentJson: string;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  is_public: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

// SQLite datetime('now') returns 'YYYY-MM-DD HH:MM:SS' UTC without timezone indicator.
// Append 'Z' so JavaScript correctly treats it as UTC instead of local time.
function toUtcIso(dt: string): string {
  if (!dt) return dt;
  if (dt.includes('T') || dt.endsWith('Z') || dt.includes('+')) return dt;
  return dt.replace(' ', 'T') + 'Z';
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    contentJson: row.content_json,
    isPublic: row.is_public === 1,
    publicSlug: row.public_slug,
    createdAt: toUtcIso(row.created_at),
    updatedAt: toUtcIso(row.updated_at),
  };
}

export async function createNote(
  userId: string,
  data?: { title?: string; contentJson?: string }
): Promise<Note> {
  const id = nanoid();
  const title = data?.title ?? "Untitled note";
  const contentJson =
    data?.contentJson ?? '{"type":"doc","content":[]}';
  run(
    `INSERT INTO notes (id, user_id, title, content_json) VALUES (?, ?, ?, ?)`,
    [id, userId, title, contentJson]
  );
  return toNote(
    get<NoteRow>(`SELECT * FROM notes WHERE id = ?`, [id])!
  );
}

export async function getNoteById(
  userId: string,
  noteId: string
): Promise<Note | null> {
  const row = get<NoteRow>(
    `SELECT * FROM notes WHERE id = ? AND user_id = ?`,
    [noteId, userId]
  );
  return row ? toNote(row) : null;
}

export async function getNotesByUser(userId: string): Promise<Note[]> {
  const rows = query<NoteRow>(
    `SELECT id, user_id, title, is_public, public_slug, created_at, updated_at,
            '' AS content_json
     FROM notes WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId]
  );
  return rows.map(toNote);
}

export async function updateNote(
  userId: string,
  noteId: string,
  data: Partial<{ title: string; contentJson: string }>
): Promise<Note | null> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (data.title !== undefined) {
    fields.push("title = ?");
    params.push(data.title);
  }
  if (data.contentJson !== undefined) {
    fields.push("content_json = ?");
    params.push(data.contentJson);
  }
  if (fields.length === 0) return getNoteById(userId, noteId);

  fields.push("updated_at = datetime('now')");
  params.push(noteId, userId);

  run(
    `UPDATE notes SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    params
  );
  return getNoteById(userId, noteId);
}

export async function deleteNote(
  userId: string,
  noteId: string
): Promise<void> {
  run(`DELETE FROM notes WHERE id = ? AND user_id = ?`, [noteId, userId]);
}

export async function setNotePublic(
  userId: string,
  noteId: string,
  isPublic: boolean
): Promise<Note | null> {
  if (isPublic) {
    const existing = await getNoteById(userId, noteId);
    if (!existing) return null;
    const slug = existing.publicSlug ?? nanoid(21);
    run(
      `UPDATE notes SET is_public = 1, public_slug = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [slug, noteId, userId]
    );
  } else {
    run(
      `UPDATE notes SET is_public = 0, public_slug = NULL, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [noteId, userId]
    );
  }
  return getNoteById(userId, noteId);
}

export type PublicNotePreview = {
  id: string;
  title: string;
  publicSlug: string;
  updatedAt: string;
  ownerName: string;
};

export async function getPublicNotes(excludeUserId: string): Promise<PublicNotePreview[]> {
  const rows = query<{ id: string; title: string; public_slug: string; updated_at: string; owner_name: string }>(
    `SELECT notes.id, notes.title, notes.public_slug, notes.updated_at, user.name AS owner_name
     FROM notes JOIN user ON notes.user_id = user.id
     WHERE notes.is_public = 1 AND notes.user_id != ?
     ORDER BY notes.updated_at DESC`,
    [excludeUserId]
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    publicSlug: row.public_slug,
    updatedAt: toUtcIso(row.updated_at),
    ownerName: row.owner_name,
  }));
}

// Fetch a note by ID regardless of owner — only when it's publicly shared.
// Used to redirect non-owners to the public viewer.
export async function getPublicNoteById(noteId: string): Promise<Note | null> {
  const row = get<NoteRow>(
    `SELECT * FROM notes WHERE id = ? AND is_public = 1`,
    [noteId]
  );
  return row ? toNote(row) : null;
}

export type PublicNote = Note & { ownerName: string };

export async function getNoteByPublicSlug(
  slug: string
): Promise<PublicNote | null> {
  const row = get<NoteRow & { owner_name: string }>(
    `SELECT notes.*, user.name AS owner_name
     FROM notes JOIN user ON notes.user_id = user.id
     WHERE notes.public_slug = ? AND notes.is_public = 1`,
    [slug]
  );
  return row ? { ...toNote(row), ownerName: row.owner_name } : null;
}
