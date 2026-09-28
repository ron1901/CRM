'use client';
import { useTransition } from 'react';
import type { ActionResult } from '@/lib/types';

export function DeleteButton({
  action,
  confirmText,
  label = 'Delete',
  className = 'btn-danger',
}: {
  action: () => Promise<ActionResult>;
  confirmText: string;
  label?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (r && r.error) alert(r.error);
        });
      }}
    >
      {pending ? '…' : label}
    </button>
  );
}
