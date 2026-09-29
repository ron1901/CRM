'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { HUNTING_GROUNDS, OWNERS, SOURCES, STATUSES } from '@/lib/options';
import type { Contact } from '@/lib/types';

type Row = Contact & { referrer_name: string | null };
type SortKey = 'name' | 'company' | 'status' | 'owner' | 'hunting_ground' | 'last_touch_date' | 'next_action_date';

const COLS: [SortKey | null, string][] = [
  ['name', 'Name'], ['company', 'Company'], ['status', 'Status'], ['owner', 'Owner'], ['hunting_ground', 'Hunting ground'],
  [null, 'Source'], ['last_touch_date', 'Last touch'], ['next_action_date', 'Next action'],
];

export function ContactsTable({ rows, today }: { rows: Row[]; today: string }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [owner, setOwner] = useState('');
  const [ground, setGround] = useState('');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });

  const shown = useMemo(() => {
    const needle = q.toLowerCase();
    return rows
      .filter(
        (c) =>
          (!status || c.status === status) &&
          (!owner || c.owner === owner) &&
          (!ground || c.hunting_ground === ground) &&
          (!source || c.source === source) &&
          (!needle || [c.name, c.company, c.title, c.country, c.function].join(' ').toLowerCase().includes(needle)),
      )
      .sort((a, b) => {
        const av = a[sort.key] ?? '';
        const bv = b[sort.key] ?? '';
        if (av === bv) return 0;
        if (av === '') return 1; // blanks last
        if (bv === '') return -1;
        return String(av).localeCompare(String(bv)) * sort.dir;
      });
  }, [rows, q, status, owner, ground, source, sort]);

  const pick = (label: string, value: string, set: (v: string) => void, options: readonly string[]) => (
    <select className="input max-w-44" value={value} onChange={(e) => set(e.target.value)}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-56" placeholder="Search name, company, title…" value={q} onChange={(e) => setQ(e.target.value)} />
        {pick('All statuses', status, setStatus, STATUSES)}
        {pick('All owners', owner, setOwner, OWNERS)}
        {pick('All hunting grounds', ground, setGround, HUNTING_GROUNDS)}
        {pick('All sources', source, setSource, SOURCES)}
        <span className="text-slate-400">{shown.length} of {rows.length}</span>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead>
            <tr>
              {COLS.map(([key, label]) => (
                <th key={label}>
                  {key ? (
                    <button className="uppercase hover:text-cyan-300" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))}>
                      {label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                    </button>
                  ) : label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="hover:bg-white/5">
                <td>
                  <Link className="link font-medium" href={`/contacts/${c.id}`}>{c.name}</Link>
                  <div className="text-xs text-slate-400">{[c.title, c.seniority].filter(Boolean).join(' · ')}</div>
                </td>
                <td>{c.company}<div className="text-xs text-slate-400">{[c.company_type, c.country].filter(Boolean).join(' · ')}</div></td>
                <td><span className="badge bg-white/10">{c.status}</span></td>
                <td>{c.owner}</td>
                <td>{c.hunting_ground}</td>
                <td className="text-xs">{c.source}{c.referrer_name && <div className="text-slate-400">via {c.referrer_name}</div>}</td>
                <td className="whitespace-nowrap">{c.last_touch_date}</td>
                <td className="text-xs">
                  {c.next_action_date && <span className={c.next_action_date < today ? 'text-rose-400' : 'text-slate-300'}>{c.next_action_date} </span>}
                  {c.next_action}
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={8} className="text-slate-400">No contacts match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
