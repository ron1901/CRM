'use client';
import { useState, useTransition, type ReactNode } from 'react';
import type { ActionResult } from '@/lib/types';

// Submits to a server action without React's auto-reset, so a validation error never wipes what you typed.
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const r = await action(fd);
          if (r && r.error) {
            // A missing column means the Supabase SQL update hasn't been run yet, not that a field is required.
            const dbUpdate = /schema cache|does not exist/i.test(r.error);
            setError(dbUpdate ? `The database needs a one-time update (run the latest SQL from the README in Supabase → SQL Editor). Details: ${r.error}` : r.error);
          }
          else {
            setError(null);
            if (resetOnSuccess) form.reset();
          }
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {error && <p className="mt-2 rounded bg-rose-500/10 p-2 text-rose-300">{error}</p>}
    </form>
  );
}
