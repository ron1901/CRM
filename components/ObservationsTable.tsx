'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { assignCluster } from '@/app/observations/actions';
import type { Observation } from '@/lib/types';

export type ObsRow = Observation & {
  interview: { id: string; date: string; contact: { id: string; name: string; company: string | null; hunting_ground: string | null } | null } | null;
};

export function ObservationsTable({ rows, clusters }: { rows: ObsRow[]; clusters: { id: string; name: string }[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState('');
  const [newName, setNewName] = useState('');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const clusterName = (id: string | null) => clusters.find((c) => c.id === id)?.name;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function apply() {
    const ids = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
    const creating = target === '__new';
    if (creating && !newName.trim()) return setMsg('Enter a name for the new cluster.');
    start(async () => {
      const r = await assignCluster(ids, creating ? '' : target, creating ? newName : '');
      if (r && r.error) setMsg(r.error);
      else {
        setMsg(`Updated ${ids.length} observation(s).`);
        setSelected(new Set());
        setNewName('');
        setTarget('');
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded bg-slate-950/80 backdrop-blur p-2 shadow-sm">
        <span className="font-medium">{selected.size} selected →</span>
        <select className="input max-w-56" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">(remove from cluster)</option>
          {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="__new">+ New cluster…</option>
        </select>
        {target === '__new' && <input className="input max-w-56" placeholder="New cluster name" value={newName} onChange={(e) => setNewName(e.target.value)} />}
        <button className="btn" disabled={pending || selected.size === 0} onClick={apply}>Assign</button>
        {msg && <span className="text-slate-300">{msg}</span>}
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
              <th>Problem</th><th>Quote</th><th>Who</th><th>Evidence</th><th>Sev</th><th>Freq/mo</th><th>Hrs</th><th>Cost</th><th>Tags</th><th>Cluster</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className={selected.has(o.id) ? 'bg-cyan-400/10' : 'hover:bg-white/5'}>
                <td><input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} /></td>
                <td className="max-w-xs">
                  <Link className="link" href={`/interviews/${o.interview?.id}`}>{o.problem_statement}</Link>
                  {o.workflow_step && <div className="text-xs text-slate-400">{o.workflow_step}</div>}
                </td>
                <td className="max-w-xs text-xs italic text-slate-300">{o.quote && `“${o.quote}”`}</td>
                <td className="whitespace-nowrap text-xs">{o.interview?.contact?.name}<div className="text-slate-400">{o.interview?.contact?.company}</div></td>
                <td><span className={`badge ${o.evidence_type === 'Paid-for' ? 'bg-emerald-400/15 text-emerald-300' : o.evidence_type === 'Documented' ? 'bg-sky-400/15 text-sky-300' : 'bg-white/10'}`}>{o.evidence_type}</span></td>
                <td>{o.severity}</td>
                <td>{o.frequency_per_month}</td>
                <td>{o.time_spent_hours}</td>
                <td className="text-xs">{o.cost_estimate}</td>
                <td className="text-xs">{o.tags.join(', ')}</td>
                <td className="text-xs">{clusterName(o.cluster_id) ?? <span className="text-slate-500">—</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={11} className="text-slate-400">No observations match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
