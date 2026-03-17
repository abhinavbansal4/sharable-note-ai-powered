import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNoteById, updateNote, deleteNote } from "@/lib/notes";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await getNoteById(session.user.id, id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(note);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { title, contentJson } = body;

  if (title === undefined && contentJson === undefined) {
    return NextResponse.json({ error: "title or contentJson required" }, { status: 400 });
  }

  // The client sends contentJson as an already-stringified JSON string.
  // Do NOT re-stringify it — that would double-encode and corrupt the stored value.
  const contentJsonStr =
    contentJson !== undefined
      ? typeof contentJson === 'string'
        ? contentJson
        : JSON.stringify(contentJson)
      : undefined;

  if (contentJsonStr && Buffer.byteLength(contentJsonStr) > 500_000) {
    return NextResponse.json({ error: "Content too large" }, { status: 413 });
  }

  const note = await updateNote(session.user.id, id, { title, contentJson: contentJsonStr });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(note);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await getNoteById(session.user.id, id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteNote(session.user.id, id);
  return new NextResponse(null, { status: 204 });
}
