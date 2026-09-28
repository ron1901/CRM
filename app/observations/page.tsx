import Link from 'next/link';
import { db } from '@/lib/supabase/server';
import { ObservationsTable, type ObsRow } from '@/components/ObservationsTable';
import { EVIDENCE_TYPES, HUNTING_GROUNDS } from '@/lib/options';

type Filters = { cluster?: string; evidence?: string; ground?: string; minsev?: string; tag?: string; q?: string };

export default async function ObservationsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const f = await searchParams;
  const supabase = await db();
  const [{ data, error }, { data: clusters }] = await Promise.all([
    supabase
      .from('observations')
      .select('*, interview:interviews(id,date,contact:contacts!interviews_contact_id_fkey(id,name,company,hunting_ground))')
      .order('created_at', { ascending: false }),
    supabase.from('clusters').select('id,name').order('name'),
  ]);
  if (error) throw new Error(error.message);
  const all = (data ?? []) as unknown as ObsRow[];
  const q = f.q?.toLowerCase();
  const rows = all.filter(
    (o) =>
      (!f.cluster || (f.cluster === 'none' ? !o.cluster_id : o.cluster_id === f.cluster)) &&
      (!f.evidence || o.evidence_type === f.evidence) &&
      (!f.ground || o.interview?.contact?.hunting_ground === f.ground) &&
      (!f.minsev || (o.severity ?? 0) >= Number(f.minsev)) &&
      (!f.tag || o.tags.includes(f.tag.toLowerCase())) &&
      (!q || [o.problem_statement, o.quote, o.workflow_step, o.interview?.contact?.company].join(' ').toLowerCase().includes(q)),
  );
  const tags = [...new Set(all.flatMap((o) => o.tags))].sort();

  return (
    <div className="space-y-4">
      <h1 className="h1">Observations ({rows.length} of {all.length})</h1>
      <form className="flex flex-wrap items-end gap-2">
        <input name="q" defaultValue={f.q} placeholder="Search text" className="input max-w-48" />
        <select name="cluster" defaultValue={f.cluster ?? ''} className="input max-w-48">
          <option value="">Any cluster</option>
          <option value="none">Unclustered</option>
          {(clusters ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="evidence" defaultValue={f.evidence ?? ''} className="input max-w-40">
          <option value="">Any evidence</option>
          {EVIDENCE_TYPES.map((e) => <option key={e}>{e}</option>)}
        </select>
        <select name="ground" defaultValue={f.ground ?? ''} className="input max-w-48">
          <option value="">Any hunting ground</option>
          {HUNTING_GROUNDS.map((e) => <option key={e}>{e}</option>)}
        </select>
        <select name="minsev" defaultValue={f.minsev ?? ''} className="input max-w-36">
          <option value="">Any severity</option>
          {[2, 3, 4, 5].map((n) => <option key={n} value={n}>Severity ≥ {n}</option>)}
        </select>
        <select name="tag" defaultValue={f.tag ?? ''} className="input max-w-40">
          <option value="">Any tag</option>
          {tags.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button className="btn">Filter</button>
        <Link href="/observations" className="btn-ghost">Clear</Link>
      </form>
      <ObservationsTable rows={rows} clusters={clusters ?? []} />
    </div>
  );
}
