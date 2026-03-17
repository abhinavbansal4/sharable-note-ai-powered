import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createNote, getNotesByUser } from "@/lib/notes";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await getNotesByUser(session.user.id);
  return NextResponse.json(
    notes.map(({ id, title, isPublic, updatedAt }) => ({ id, title, isPublic, updatedAt }))
  );
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const contentJson =
    body.contentJson !== undefined ? JSON.stringify(body.contentJson) : undefined;

  const note = await createNote(session.user.id, { title: body.title, contentJson });
  return NextResponse.json(note, { status: 201 });
}
