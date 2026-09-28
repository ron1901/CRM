import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase/server';
import { InterviewForm } from '@/components/InterviewForm';
import { ObservationForm } from '@/components/ObservationForm';
import { ActionForm } from '@/components/ActionForm';
import { DeleteButton } from '@/components/DeleteButton';
import { Field, Select } from '@/components/Fields';
import { addReferral, deleteInterview, deleteObservation, saveInterview } from '../actions';
import { OWNERS } from '@/lib/options';
import { today } from '@/lib/form';
import type { Contact, Interview, Observation } from '@/lib/types';

export default async function InterviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const supabase = await db();
  const { data: interview } = await supabase.from('interviews').select('*').eq('id', id).maybeSingle<Interview>();
  if (!interview) notFound();
  const [{ data: contact }, { data: observations }, { data: clusters }, { data: referrals }] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', interview.contact_id).single<Contact>(),
    supabase.from('observations').select('*').eq('interview_id', id).order('created_at'),
    supabase.from('clusters').select('id,name').order('name'),
    supabase.from('contacts').select('id,name,company,status').eq('referred_in_interview', id).order('created_at'),
  ]);
  const obs = (observations ?? []) as Observation[];
  const clusterList = clusters ?? [];
  const clusterName = (cid: string | null) => clusterList.find((c) => c.id === cid)?.name;

  return (
    <div className="space-y-4">
      {isNew && <p className="rounded bg-green-50 p-2 text-green-800">Interview saved. Now add observations (one per problem mentioned) and any referrals.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="h1 mb-0 mr-auto">
          {interview.date} · <Link className="link" href={`/contacts/${contact?.id}`}>{contact?.name}</Link>
          <span className="ml-2 text-base font-normal text-slate-500">{[contact?.title, contact?.company, contact?.hunting_ground].filter(Boolean).join(' · ')}</span>
        </h1>
        <DeleteButton
          action={deleteInterview.bind(null, id)}
          confirmText={`Delete this interview, its transcript/recording link and ${obs.length} observation(s)?`}
          label="Delete interview"
          className="btn-ghost text-red-600"
        />
      </div>

      <details className="card">
        <summary className="cursor-pointer font-semibold">
          Interview details <span className="font-normal text-slate-500">— {interview.workflow_discussed ?? 'no workflow'} · {interview.interviewers} · {interview.consent_to_record ? 'recorded' : 'not recorded'}</span>
        </summary>
        <div className="mt-4">
          <InterviewForm action={saveInterview.bind(null, id)} interview={interview} today={today()} />
        </div>
      </details>

      <div className="card">
        <h2 className="h2">Observations ({obs.length})</h2>
        <div className="mb-4 space-y-2">
          {obs.map((o) => (
            <details key={o.id} className="rounded border border-slate-200 p-2">
              <summary className="cursor-pointer">
                <span className="badge mr-2 bg-slate-100">{o.evidence_type}</span>
                {o.severity && <span className="badge mr-2 bg-amber-100">sev {o.severity}</span>}
                {o.problem_statement}
                {o.cluster_id && <span className="ml-2 text-xs text-indigo-600">→ {clusterName(o.cluster_id)}</span>}
              </summary>
              <div className="mt-3 space-y-2">
                <ObservationForm interviewId={id} observation={o} clusters={clusterList} />
                <DeleteButton action={deleteObservation.bind(null, o.id, id)} confirmText="Delete this observation?" label="Delete observation" className="btn-ghost text-red-600" />
              </div>
            </details>
          ))}
        </div>
        <div className="rounded bg-indigo-50/50 p-3">
          <h3 className="mb-2 font-medium">Add observation</h3>
          <ObservationForm interviewId={id} clusters={clusterList} />
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Referrals given ({(referrals ?? []).length})</h2>
        <ul className="mb-3 space-y-1">
          {(referrals ?? []).map((r) => (
            <li key={r.id}><Link className="link" href={`/contacts/${r.id}`}>{r.name}</Link> {r.company && `(${r.company})`} — {r.status}</li>
          ))}
        </ul>
        <ActionForm action={addReferral.bind(null, id, interview.contact_id)} resetOnSuccess className="grid items-end gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Name *"><input name="name" className="input" required /></Field>
          <Field label="Title"><input name="title" className="input" /></Field>
          <Field label="Company"><input name="company" className="input" /></Field>
          <Field label="LinkedIn URL"><input name="linkedin_url" type="url" className="input" /></Field>
          <Field label="Owner"><Select name="owner" options={OWNERS} /></Field>
          <button className="btn justify-center">+ Add referral</button>
        </ActionForm>
        <p className="mt-2 text-xs text-slate-500">Creates a Target contact (source: Snowball referral, referred by {contact?.name}).</p>
      </div>
    </div>
  );
}
