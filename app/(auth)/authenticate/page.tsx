'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

type Mode = 'signin' | 'signup';

export default function AuthenticatePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await authClient.signIn.email({ email, password, callbackURL: '/dashboard' });
      if (error) { setError(error.message ?? 'Sign in failed'); setLoading(false); }
      else router.push('/dashboard');
    } else {
      const { error } = await authClient.signUp.email({ email, password, name, callbackURL: '/dashboard' });
      if (error) { setError(error.message ?? 'Sign up failed'); setLoading(false); }
      else router.push('/dashboard');
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400';
  const btnPrimaryCls = 'w-full px-4 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity';
  const btnSocialCls = 'w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors';

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-6 dark:text-white">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputCls}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputCls}
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className={inputCls}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className={btnPrimaryCls}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          <span className="text-xs text-neutral-400">or</span>
          <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="space-y-2">
          <button
            className={btnSocialCls}
            onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })}
          >
            Continue with Google
          </button>
          <button
            className={btnSocialCls}
            onClick={() => authClient.signIn.social({ provider: 'github', callbackURL: '/dashboard' })}
          >
            Continue with GitHub
          </button>
        </div>

        <p className="mt-6 text-sm text-center text-neutral-500 dark:text-neutral-400">
          {mode === 'signin' ? (
            <>No account?{' '}
              <button onClick={() => setMode('signup')} className="text-neutral-900 dark:text-white hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => setMode('signin')} className="text-neutral-900 dark:text-white hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
