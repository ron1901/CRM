'use client';

// Friendly fallback for unexpected server errors (instead of Next's blank "Application error" page).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const missingColumn = /column .* does not exist|Could not find the '.*' column/i.test(error.message);
  return (
    <div className="card mx-auto mt-16 max-w-xl space-y-3">
      <h1 className="h1">Something went wrong</h1>
      {missingColumn ? (
        <p className="text-slate-300">
          The database is missing a recent update. Run the latest SQL snippet from <code>supabase/migrations/</code> (see the README) in the
          Supabase SQL Editor, then reload.
        </p>
      ) : (
        <p className="text-slate-300">The page could not load. Try again; if it keeps happening, send a screenshot of this box.</p>
      )}
      <p className="font-mono text-xs text-slate-500">{error.message || 'Server error'}{error.digest && ` · ${error.digest}`}</p>
      <button className="btn" onClick={reset}>Try again</button>
    </div>
  );
}
