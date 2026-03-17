'use client';

import { formatDistanceToNow } from 'date-fns';

export function LocalTime({ iso, relative = false }: { iso: string; relative?: boolean }) {
  // During SSR, skip rendering and let suppressHydrationWarning handle the mismatch.
  // This avoids using browser-only APIs (navigator, Date.now) on the server.
  if (typeof window === 'undefined') {
    return <time dateTime={iso} suppressHydrationWarning />;
  }

  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();

  // Only show relative time for past dates within the last 7 days.
  // Future timestamps (timezone/storage quirk) fall through to absolute format.
  if (relative && diffMs >= 0 && diffMs < 7 * 24 * 60 * 60 * 1000) {
    return (
      <time dateTime={iso} suppressHydrationWarning>
        {formatDistanceToNow(date, { addSuffix: true })}
      </time>
    );
  }

  const formatted = new Intl.DateTimeFormat(navigator.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(date);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
