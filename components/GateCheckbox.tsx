'use client';
import { useTransition } from 'react';
import { toggleGate } from '@/app/actions';

export function GateCheckbox({ id, done }: { id: string; done: boolean }) {
  const [pending, start] = useTransition();
  return (
    <input type="checkbox" defaultChecked={done} disabled={pending} onChange={(e) => { const v = e.target.checked; start(() => toggleGate(id, v)); }} />
  );
}
