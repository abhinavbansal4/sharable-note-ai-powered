import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNoteById } from "@/lib/notes";
import { recordShare } from "@/lib/shares";
import { checkRateLimit } from "@/lib/ratelimit";
import { sendShareEmail } from "@/lib/email";
import { sendShareSms } from "@/lib/sms";

type Params = { params: Promise<{ id: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{1,14}$/;

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await getNoteById(session.user.id, id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!note.isPublic) {
    return NextResponse.json({ error: "Note is not public" }, { status: 400 });
  }

  if (!checkRateLimit(`share:${session.user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const { method, recipients, message } = body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: "recipients array required" }, { status: 400 });
  }

  if (message !== undefined && message.length > 500) {
    return NextResponse.json({ error: "Message exceeds 500 characters" }, { status: 413 });
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${note.publicSlug}`;

  if (method === "email") {
    const invalid = (recipients as string[]).filter((r) => !EMAIL_RE.test(r));
    if (invalid.length) {
      return NextResponse.json({ error: "Invalid email addresses" }, { status: 400 });
    }

    try {
      await sendShareEmail({
        to: recipients,
        senderName: session.user.name,
        noteTitle: note.title,
        publicUrl,
        message,
      });
    } catch {
      return NextResponse.json({ error: "Email delivery failed" }, { status: 502 });
    }

    for (const recipient of recipients as string[]) {
      await recordShare({ noteId: note.id, sharedBy: session.user.id, recipient, method: "email" });
    }
  } else if (method === "sms") {
    const invalid = (recipients as string[]).filter((r) => !E164_RE.test(r));
    if (invalid.length) {
      return NextResponse.json({ error: "Invalid phone numbers, E.164 required" }, { status: 400 });
    }

    for (const recipient of recipients as string[]) {
      try {
        await sendShareSms({ to: recipient, senderName: session.user.name, publicUrl });
      } catch {
        return NextResponse.json({ error: "SMS delivery failed" }, { status: 502 });
      }
      await recordShare({ noteId: note.id, sharedBy: session.user.id, recipient, method: "sms" });
    }
  } else {
    return NextResponse.json({ error: "method must be 'email' or 'sms'" }, { status: 400 });
  }

  return NextResponse.json({ sent: (recipients as string[]).length });
}
