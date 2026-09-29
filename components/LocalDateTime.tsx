'use client';
import { useEffect, useRef, useState } from 'react';

// datetime-local shows the viewer's local time (Dublin or Tel Aviv); we store an absolute ISO timestamp.
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LocalDateTimeInput({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  // Filled after mount: the server (UTC) and the browser disagree on local time.
  const [local, setLocal] = useState('');
  useEffect(() => setLocal(toLocalInput(defaultValue)), [defaultValue]);
  // Controlled input: follow the surrounding form's reset() too.
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const form = ref.current?.form;
    const onReset = () => setLocal(toLocalInput(defaultValue));
    form?.addEventListener('reset', onReset);
    return () => form?.removeEventListener('reset', onReset);
  }, [defaultValue]);
  return (
    <>
      <input ref={ref} type="datetime-local" className="input" value={local} onChange={(e) => setLocal(e.target.value)} />
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
