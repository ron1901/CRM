import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase/server';
import { ActionForm } from '@/components/ActionForm';
import { DeleteButton } from '@/components/DeleteButton';
import { Field, Select } from '@/components/Fields';
import { EntryBarBadge, EntryBarChecklist, scoredCount } from '@/components/ClusterBadges';
import { deleteCluster, saveCluster, unassignObservation } from '../actions';
import { CLUSTER_STATUSES, HUNTING_GROUNDS, SCORE_CRITERIA } from '@/lib/options';
import type { ClusterStats } from '@/lib/types';
import type { ObsRow } from '@/components/ObservationsTable';

const EVIDENCE_ORDER: Record<string, number> = { 'Paid-for': 0, Documented: 1, Stated: 2 };

export default async function ClusterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await db();
  const [{ data: c }, { data: obsData }] = await Promise.all([
    supabase.from('cluster_stats').select('*').eq('id', id).maybeSingle<ClusterStats>(),
    supabase
      .from('observations')
      .select('*, interview:interviews(id,date,contact:contacts!interviews_contact_id_fkey(id,name,title,company,company_type,hunting_ground))')
      .eq('cluster_id', id),
  ]);
  if (!c) notFound();
  const obs = ((obsData ?? []) as unknown as ObsRow[]).sort(
    (a, b) => EVIDENCE_ORDER[a.evidence_type] - EVIDENCE_ORDER[b.evidence_type] || (b.severity ?? 0) - (a.severity ?? 0),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1 mb-0">{c.name}</h1>
        <EntryBarBadge c={c} />
        <span className="text-lg font-semibold">{Number(c.weighted_score).toFixed(2)} <span className="text-sm font-normal text-slate-400">/ 5 ({scoredCount(c)}/7 scored)</span></span>
        <div className="ml-auto">
          <DeleteButton action={deleteCluster.bind(null, id)} confirmText={`Delete cluster "${c.name}"? Its ${c.observation_count} observations are kept but become unclustered.`} label="Delete cluster" className="btn-ghost text-rose-400" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h2 className="h2">Evidence</h2>
          <EntryBarChecklist c={c} />
          <p className="mt-2 text-slate-400">{c.observation_count} observations</p>
        </div>
        <div className="card lg:col-span-2">
          <ActionForm action={saveCluster.bind(null, id)} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name" className="sm:col-span-2"><input name="name" className="input" required defaultValue={c.name} /></Field>
              <Field label="Status"><Select name="status" options={CLUSTER_STATUSES} blank={false} defaultValue={c.status} /></Field>
              <Field label="Hunting ground"><Select name="hunting_ground" options={HUNTING_GROUNDS} defaultValue={c.hunting_ground} /></Field>
              <Field label="Owner persona"><input name="owner_persona" className="input" defaultValue={c.owner_persona ?? ''} placeholder="e.g. Head of Reg Ops, mid-size" /></Field>
              <Field label="Competitors / alternatives"><input name="competitors_alternatives" className="input" defaultValue={c.competitors_alternatives ?? ''} /></Field>
            </div>
            <Field label="Description"><textarea name="description" rows={2} className="input" defaultValue={c.description ?? ''} /></Field>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCORE_CRITERIA.map((s) => (
                <label key={s.key} className="flex items-center gap-2">
                  <select name={s.key} className="input !w-16 shrink-0" defaultValue={c[s.key] ?? ''}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
                  </select>
                  <span>{s.label} <span className="text-slate-500">({s.weight}%)</span></span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              For “independent interviews/companies”, the computed counts are {c.interviewee_count} interviewees across {c.company_count} companies.
            </p>
            <button className="btn">Save cluster</button>
          </ActionForm>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Observations ({obs.length})</h2>
        <div className="space-y-3">
          {obs.map((o) => (
            <div key={o.id} className="border-l-4 pl-3" style={{ borderColor: o.evidence_type === 'Paid-for' ? '#34d399' : o.evidence_type === 'Documented' ? '#38bdf8' : '#475569' }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-white/10">{o.evidence_type}</span>
                {o.severity && <span className="badge bg-amber-400/15 text-amber-200">sev {o.severity}</span>}
                <span className="font-medium">{o.problem_statement}</span>
              </div>
              {o.quote && <blockquote className="mt-1 italic text-slate-200">“{o.quote}”</blockquote>}
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400">
                <Link className="link" href={`/interviews/${o.interview?.id}`}>{o.interview?.contact?.name} · {o.interview?.contact?.company} · {o.interview?.date}</Link>
                {o.frequency_text && <span>freq: {o.frequency_text}{o.frequency_per_month != null && ` (${o.frequency_per_month}/mo)`}</span>}
                {o.time_spent_hours != null && <span>{o.time_spent_hours} h each</span>}
                {o.cost_estimate && <span>cost: {o.cost_estimate}</span>}
                {o.current_solution && <span>now: {o.current_solution}</span>}
                {o.workaround && <span>workaround: {o.workaround}</span>}
                <DeleteButton action={unassignObservation.bind(null, o.id, id)} confirmText="Remove this observation from the cluster?" label="remove from cluster" className="text-xs text-rose-400 hover:underline" />
              </div>
            </div>
          ))}
          {obs.length === 0 && <p className="text-slate-400">No observations yet. Assign them from the Observations table.</p>}
        </div>
      </div>
    </div>
  );
}
