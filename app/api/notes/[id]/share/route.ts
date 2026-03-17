import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setNotePublic } from "@/lib/notes";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (typeof body.isPublic !== "boolean") {
    return NextResponse.json({ error: "isPublic boolean required" }, { status: 400 });
  }

  const note = await setNotePublic(session.user.id, id, body.isPublic);
  if (!note) {
    return NextResponse.json(
      { error: "You don't have permission to share this note. Make sure you're signed in with the correct account." },
      { status: 403 }
    );
  }

  return NextResponse.json({ id: note.id, isPublic: note.isPublic, publicSlug: note.publicSlug });
}
