import Link from 'next/link';
import { db } from '@/lib/supabase/server';
import { ActionForm } from '@/components/ActionForm';
import { Select } from '@/components/Fields';
import { EntryBarBadge, scoredCount } from '@/components/ClusterBadges';
import { createCluster } from './actions';
import { HUNTING_GROUNDS } from '@/lib/options';
import type { ClusterStats } from '@/lib/types';

export default async function ClustersPage() {
  const supabase = await db();
  const { data, error } = await supabase.from('cluster_stats').select('*').order('weighted_score', { ascending: false });
  if (error) throw new Error(error.message);
  const all = (data ?? []) as ClusterStats[];
  // Dropped clusters sink to the bottom; otherwise ranked by weighted score.
  const rows = [...all.filter((c) => c.status !== 'Dropped'), ...all.filter((c) => c.status === 'Dropped')];
  return (
    <div className="space-y-4">
      <h1 className="h1">Problem clusters</h1>
      <ActionForm action={createCluster} className="flex flex-wrap items-end gap-2">
        <input name="name" className="input max-w-72" placeholder="New cluster name" required />
        <div className="w-48"><Select name="hunting_ground" options={HUNTING_GROUNDS} /></div>
        <button className="btn">+ Cluster</button>
      </ActionForm>
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead>
            <tr><th>#</th><th>Cluster</th><th>Score</th><th>Entry bar</th><th>Interviewees</th><th>Companies</th><th>Obs</th><th>Paid-for</th><th>Hunting ground</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.id} className={c.status === 'Dropped' ? 'text-slate-400' : 'hover:bg-slate-50'}>
                <td>{i + 1}</td>
                <td><Link className="link font-medium" href={`/clusters/${c.id}`}>{c.name}</Link></td>
                <td>
                  <span className="font-semibold">{Number(c.weighted_score).toFixed(2)}</span>
                  <span className="text-xs text-slate-400"> / 5 · {scoredCount(c)}/7 scored</span>
                </td>
                <td><EntryBarBadge c={c} /></td>
                <td>{c.interviewee_count}</td>
                <td>{c.company_count}</td>
                <td>{c.observation_count}</td>
                <td>{c.has_paid_evidence ? '✓' : ''}</td>
                <td>{c.hunting_ground}</td>
                <td>{c.status}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={10} className="text-slate-500">No clusters yet. Create one here or from the Observations table.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
