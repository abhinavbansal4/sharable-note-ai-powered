import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4 dark:text-white">
        Rich-text notes you can share
      </h1>
      <p className="text-lg text-neutral-500 dark:text-neutral-400 mb-8">
        Write with a full formatting toolbar. Share instantly via a public link, email, or SMS.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="/authenticate"
          className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Get started
        </Link>
        <Link
          href="/authenticate"
          className="px-5 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
