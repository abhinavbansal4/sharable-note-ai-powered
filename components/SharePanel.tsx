'use client';

import { useState } from 'react';
import { LocalTime } from './LocalTime';
import type { NoteShare } from '@/lib/shares';

type Tab = 'link' | 'email' | 'sms';

type Props = {
  noteId: string;
  isPublic: boolean;
  publicSlug: string | null;
  initialShares: NoteShare[];
};

export function SharePanel({ noteId, isPublic: initialIsPublic, publicSlug: initialSlug, initialShares }: Props) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publicSlug, setPublicSlug] = useState(initialSlug);
  const [tab, setTab] = useState<Tab>('link');
  const [shares, setShares] = useState(initialShares);
  const [copied, setCopied] = useState(false);
  const [toggleError, setToggleError] = useState('');

  // Email state
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');
  const [emailStatus, setEmailStatus] = useState('');

  // SMS state
  const [phone, setPhone] = useState('');
  const [smsStatus, setSmsStatus] = useState('');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const publicUrl = publicSlug ? `${appUrl}/p/${publicSlug}` : null;

  const togglePublic = async () => {
    setToggleError('');
    const res = await fetch(`/api/notes/${noteId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: !isPublic }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.error ?? 'Failed to update sharing settings';
      setToggleError(res.status === 403 ? `${msg}||refresh` : msg);
      return;
    }
    const data = await res.json();
    setIsPublic(data.isPublic);
    setPublicSlug(data.publicSlug);
  };

  const copyUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendShare = async (method: 'email' | 'sms', recipients: string[]) => {
    const setter = method === 'email' ? setEmailStatus : setSmsStatus;
    setter('sending');
    const res = await fetch(`/api/notes/${noteId}/send-share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method,
        recipients,
        ...(method === 'email' && message ? { message } : {}),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setter(res.status === 429 ? 'Rate limit reached. Try again later.' : (data.error ?? 'Failed to send'));
    } else {
      setter('Sent!');
      if (method === 'email') { setEmailInput(''); setMessage(''); }
      else setPhone('');
      // Optimistically add to history
      for (const r of recipients) {
        setShares((prev) => [
          { id: crypto.randomUUID(), noteId, sharedBy: '', recipient: r, method, sentAt: new Date().toISOString() },
          ...prev,
        ]);
      }
      setTimeout(() => setter(''), 3000);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400';
  const tabBtnCls = (t: Tab) =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${tab === t ? 'bg-neutral-200 dark:bg-neutral-700 font-medium' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'}`;

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium dark:text-white">Public sharing</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {isPublic ? 'Anyone with the link can view this note' : 'Only you can see this note'}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={isPublic}
          aria-label="Toggle public sharing"
          onClick={togglePublic}
          className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : ''}`} />
        </button>
      </div>
      {toggleError && (
        <div className="text-sm text-red-500 flex flex-col gap-1">
          <p>{toggleError.replace('||refresh', '')}</p>
          {toggleError.includes('||refresh') && (
            <button
              onClick={() => window.location.reload()}
              className="self-start text-xs underline text-red-400 hover:text-red-600"
            >
              Refresh page
            </button>
          )}
        </div>
      )}

      {/* Tabs & content (only when public) */}
      {isPublic && publicUrl && (
        <div className="space-y-3">
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1">
            {(['link', 'email', 'sms'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={tabBtnCls(t)}>
                {t === 'link' ? 'Copy link' : t === 'email' ? 'Email' : 'SMS'}
              </button>
            ))}
          </div>

          {tab === 'link' && (
            <div className="flex gap-2">
              <input readOnly value={publicUrl} className={`${inputCls} flex-1`} />
              <button
                onClick={copyUrl}
                className="px-3 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          {tab === 'email' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Emails (comma-separated)"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className={inputCls}
              />
              <div className="relative">
                <textarea
                  placeholder="Personal message (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
                <span className="absolute bottom-2 right-3 text-xs text-neutral-400">{message.length}/500</span>
              </div>
              {emailStatus && (
                <p className={`text-sm ${emailStatus === 'Sent!' ? 'text-green-600' : emailStatus === 'sending' ? 'text-neutral-400' : 'text-red-500'}`}>
                  {emailStatus === 'sending' ? 'Sending...' : emailStatus}
                </p>
              )}
              <button
                disabled={!emailInput.trim() || emailStatus === 'sending'}
                onClick={() => sendShare('email', emailInput.split(',').map((e) => e.trim()).filter(Boolean))}
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Send
              </button>
            </div>
          )}

          {tab === 'sms' && (
            <div className="space-y-2">
              <input
                type="tel"
                placeholder="+15551234567 (E.164 format)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
              />
              {smsStatus && (
                <p className={`text-sm ${smsStatus === 'Sent!' ? 'text-green-600' : smsStatus === 'sending' ? 'text-neutral-400' : 'text-red-500'}`}>
                  {smsStatus === 'sending' ? 'Sending...' : smsStatus}
                </p>
              )}
              <button
                disabled={!phone.trim() || smsStatus === 'sending'}
                onClick={() => sendShare('sms', [phone.trim()])}
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Send
              </button>
            </div>
          )}

          {/* Share history */}
          {shares.length > 0 && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-sm font-medium mb-2 dark:text-white">Share history</p>
              <ul className="space-y-1.5">
                {shares.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
                    <span className="truncate max-w-[60%]">{s.recipient}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="uppercase text-xs">{s.method}</span>
                      <LocalTime iso={s.sentAt} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
