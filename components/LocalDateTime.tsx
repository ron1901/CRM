'use client';
import { useState } from 'react';

// datetime-local shows the viewer's local time (Dublin or Tel Aviv); we store an absolute ISO timestamp.
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LocalDateTimeInput({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [local, setLocal] = useState(toLocalInput(defaultValue));
  return (
    <>
      <input type="datetime-local" className="input" value={local} onChange={(e) => setLocal(e.target.value)} />
      <input type="hidden" name={name} value={local ? new Date(local).toISOString() : ''} />
    </>
  );
}

export function LocalTime({ iso }: { iso: string | null }) {
  if (!iso) return null;
  return (
    <span suppressHydrationWarning>
      {new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}
