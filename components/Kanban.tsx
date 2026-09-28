'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { updateStatus } from '@/app/contacts/actions';
import { CLOSED_STATUSES, HUNTING_GROUNDS, OWNERS, SOURCES, STATUSES } from '@/lib/options';
import type { Contact } from '@/lib/types';
import { LocalTime } from './LocalDateTime';

export function Kanban({ contacts: initial, today }: { contacts: Contact[]; today: string }) {
  const [contacts, setContacts] = useState(initial);
  useEffect(() => setContacts(initial), [initial]);
  const [owner, setOwner] = useState('');
  const [ground, setGround] = useState('');
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();

  const visible = useMemo(
    () =>
      contacts.filter(
        (c) =>
          (!owner || c.owner === owner) &&
          (!ground || c.hunting_ground === ground) &&
          (!source || c.source === source) &&
          (!q || `${c.name} ${c.company ?? ''}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [contacts, owner, ground, source, q],
  );
  const due = visible
    .filter((c) => c.next_action_date && c.next_action_date <= today && !(CLOSED_STATUSES as readonly string[]).includes(c.status))
    .sort((a, b) => a.next_action_date!.localeCompare(b.next_action_date!));

  function move(id: string, status: string) {
    const c = contacts.find((x) => x.id === id);
    if (!c || c.status === status) return;
    let meetingAt: string | null = null;
    if (status === 'Scheduled') {
      const s = prompt(`Interview with ${c.name} booked for? (YYYY-MM-DD HH:MM, your local time — leave blank to skip)`, '');
      if (s) {
        const d = new Date(s.trim().replace(' ', 'T'));
        if (isNaN(d.getTime())) alert('Could not read that date — set it on the contact page instead.');
        else meetingAt = d.toISOString();
      }
    }
    const prev = contacts;
    setContacts((cs) => cs.map((x) => (x.id === id ? { ...x, status, meeting_at: meetingAt ?? x.meeting_at } : x)));
    start(async () => {
      const r = await updateStatus(id, status, meetingAt);
      if (r && r.error) {
        alert(r.error);
        setContacts(prev);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="input max-w-48" placeholder="Search name/company" value={q} onChange={(e) => setQ(e.target.value)} />
        <FilterSelect label="All owners" value={owner} onChange={setOwner} options={OWNERS} />
        <FilterSelect label="All hunting grounds" value={ground} onChange={setGround} options={HUNTING_GROUNDS} />
        <FilterSelect label="All sources" value={source} onChange={setSource} options={SOURCES} />
        <span className="self-center text-slate-500">{visible.length} contacts</span>
      </div>

      {due.length > 0 && (
        <div className="card border-amber-300 bg-amber-50">
          <h2 className="h2">Next actions due ({due.length})</h2>
          <ul className="space-y-1">
            {due.map((c) => (
              <li key={c.id} className="flex flex-wrap gap-x-2">
                <span className={c.next_action_date! < today ? 'font-medium text-red-700' : 'text-amber-800'}>{c.next_action_date}</span>
                <Link className="link" href={`/contacts/${c.id}`}>{c.name}</Link>
                <span className="text-slate-500">{c.company}</span>
                <span>— {c.next_action ?? '(no action text)'}</span>
                {c.owner && <span className="badge bg-slate-200">{c.owner}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const cards = visible.filter((c) => c.status === status);
          const closed = (CLOSED_STATUSES as readonly string[]).includes(status);
          return (
            <div
              key={status}
              onDragOver={(e) => { e.preventDefault(); setOver(status); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); if (dragId) move(dragId, status); setDragId(null); }}
              className={`w-60 shrink-0 rounded-lg p-2 ${closed ? 'bg-slate-200/60' : 'bg-slate-100'} ${over === status ? 'ring-2 ring-indigo-400' : ''}`}
            >
              <div className="mb-2 flex justify-between px-1 text-xs font-semibold uppercase text-slate-600">
                <span>{status}</span><span>{cards.length}</span>
              </div>
              <div className="min-h-16 space-y-2">
                {cards.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    className="cursor-grab rounded border border-slate-200 bg-white p-2 shadow-sm active:cursor-grabbing"
                  >
                    <Link href={`/contacts/${c.id}`} className="font-medium hover:text-indigo-600">{c.name}</Link>
                    <div className="text-xs text-slate-500">{[c.title, c.company].filter(Boolean).join(' · ')}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.owner && <span className="badge bg-slate-200">{c.owner}</span>}
                      {c.hunting_ground && <span className="badge bg-indigo-50 text-indigo-700">{c.hunting_ground}</span>}
                    </div>
                    {c.status === 'Scheduled' && c.meeting_at && (
                      <div className="mt-1 text-xs text-green-700">📅 <LocalTime iso={c.meeting_at} /></div>
                    )}
                    {c.next_action_date && (
                      <div className={`mt-1 text-xs ${c.next_action_date < today ? 'text-red-600' : 'text-slate-500'}`}>
                        {c.next_action_date}: {c.next_action}
                      </div>
                    )}
                    {(c.status === 'Scheduled' || c.status === 'Interviewed') && (
                      <Link href={`/interviews/new?contact=${c.id}`} className="mt-1 block text-xs link">+ Log interview</Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <select className="input max-w-48" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}
