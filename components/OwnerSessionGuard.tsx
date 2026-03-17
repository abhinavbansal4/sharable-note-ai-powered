'use client';

import { authClient } from '@/lib/auth-client';

/**
 * Shows a warning banner if the active session switches to a different account
 * after the note editor page has loaded. This prevents confusing 403 errors when
 * the user has multiple accounts open in different tabs.
 */
export function OwnerSessionGuard({ ownerUserId }: { ownerUserId: string }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending || !session) return null;
  if (session.user.id === ownerUserId) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm">
      <p className="text-amber-800 dark:text-amber-300">
        You are now signed in as <strong>{session.user.email}</strong>, but this note belongs to a different account. Edits and sharing will fail.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="shrink-0 text-xs font-medium underline text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200"
      >
        Refresh
      </button>
    </div>
  );
}
