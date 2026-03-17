export async function sendShareEmail(opts: {
  to: string[];
  senderName: string;
  noteTitle: string;
  publicUrl: string;
  message?: string;
}): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_ADDRESS,
      to: opts.to,
      subject: `${opts.senderName} shared a note with you: ${opts.noteTitle}`,
      html: [
        `<p><strong>${opts.senderName}</strong> shared a note with you.</p>`,
        `<p><a href="${opts.publicUrl}">${opts.noteTitle}</a></p>`,
        opts.message ? `<p>${opts.message}</p>` : "",
      ].join(""),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}
