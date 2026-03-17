import { nanoid } from "nanoid";
import { query, get, run } from "./db";

export type NoteShare = {
  id: string;
  noteId: string;
  sharedBy: string;
  recipient: string;
  method: "email" | "sms";
  sentAt: string;
};

type NoteShareRow = {
  id: string;
  note_id: string;
  shared_by: string;
  recipient: string;
  method: "email" | "sms";
  sent_at: string;
};

function toShare(row: NoteShareRow): NoteShare {
  return {
    id: row.id,
    noteId: row.note_id,
    sharedBy: row.shared_by,
    recipient: row.recipient,
    method: row.method,
    sentAt: row.sent_at,
  };
}

export async function recordShare(
  data: Omit<NoteShare, "id" | "sentAt">
): Promise<NoteShare> {
  const id = nanoid();
  run(
    `INSERT INTO note_shares (id, note_id, shared_by, recipient, method)
     VALUES (?, ?, ?, ?, ?)`,
    [id, data.noteId, data.sharedBy, data.recipient, data.method]
  );
  return toShare(
    get<NoteShareRow>(`SELECT * FROM note_shares WHERE id = ?`, [id])!
  );
}

export async function getSharesByNote(
  userId: string,
  noteId: string
): Promise<NoteShare[]> {
  const rows = query<NoteShareRow>(
    `SELECT ns.* FROM note_shares ns
     JOIN notes n ON n.id = ns.note_id
     WHERE ns.note_id = ? AND n.user_id = ?
     ORDER BY ns.sent_at DESC`,
    [noteId, userId]
  );
  return rows.map(toShare);
}

export async function countSharesSince(
  userId: string,
  sinceIso: string
): Promise<number> {
  const row = get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM note_shares
     WHERE shared_by = ? AND sent_at > ?`,
    [userId, sinceIso]
  );
  return row?.count ?? 0;
}
