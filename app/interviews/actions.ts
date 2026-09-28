'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { db } from '@/lib/supabase/server';
import { bool, num, str } from '@/lib/form';
import type { ActionResult } from '@/lib/types';
import { runSuggestions, type AiSuggestions, type PendingSuggestion } from '@/lib/aiSuggestions';

type Db = Awaited<ReturnType<typeof db>>;

// Kick off AI observation suggestions in the background; the page polls until they're ready.
async function startSuggestions(supabase: Db, interviewId: string) {
  const running: AiSuggestions = { status: 'running', started_at: new Date().toISOString() };
  const { error } = await supabase.from('interviews').update({ ai_suggestions: running }).eq('id', interviewId);
  if (error) return console.error('ai_suggestions update failed', error.message);
  after(() => runSuggestions(supabase, interviewId));
}

const PRE_INTERVIEW = ['Target', 'Contacted', 'Replied', 'Scheduled'];

export async function saveInterview(id: string | null, fd: FormData): Promise<ActionResult> {
  const consent = bool(fd, 'consent_to_record');
  const transcript = str(fd, 'transcript');
  const recording_url = str(fd, 'recording_url');
  if (!consent && (transcript || recording_url)) {
    return { error: 'Transcript and recording link can only be saved when consent to record is ticked.' };
  }
  const contact_id = str(fd, 'contact_id');
  const row = {
    date: str(fd, 'date'),
    interviewers: str(fd, 'interviewers'),
    duration_min: num(fd, 'duration_min'),
    workflow_discussed: str(fd, 'workflow_discussed'),
    notes: str(fd, 'notes'),
    magic_button_answer: str(fd, 'magic_button_answer'),
    consent_to_record: consent,
    // Unticking consent on an existing interview erases transcript + recording link.
    transcript: consent ? transcript : null,
    recording_url: consent ? recording_url : null,
    logged_within_30_min: bool(fd, 'logged_within_30_min'),
  };
  if (!row.date || !row.interviewers) return { error: 'Date and interviewers are required.' };
  const supabase = await db();

  if (id) {
    const { data: prev } = await supabase.from('interviews').select('transcript,notes').eq('id', id).single();
    const { error } = await supabase.from('interviews').update(row).eq('id', id);
    if (error) return { error: error.message };
    const changed = prev && (prev.transcript !== row.transcript || prev.notes !== row.notes);
    if (changed && (row.transcript || row.notes)) await startSuggestions(supabase, id);
    revalidatePath(`/interviews/${id}`);
    revalidatePath('/interviews');
    return;
  }

  if (!contact_id) return { error: 'Pick a contact.' };
  const { data, error } = await supabase.from('interviews').insert({ ...row, contact_id }).select('id').single();
  if (error) return { error: error.message };
  const { data: contact } = await supabase.from('contacts').select('status').eq('id', contact_id).single();
  const patch: Record<string, unknown> = { last_touch_date: row.date };
  if (contact && PRE_INTERVIEW.includes(contact.status)) patch.status = 'Interviewed';
  await supabase.from('contacts').update(patch).eq('id', contact_id);
  if (row.transcript || row.notes) await startSuggestions(supabase, data.id);
  revalidatePath('/', 'layout');
  redirect(`/interviews/${data.id}?new=1`);
}

export async function deleteInterview(id: string): Promise<ActionResult> {
  const supabase = await db();
  const { error } = await supabase.from('interviews').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  redirect('/interviews');
}

function observationFromForm(fd: FormData) {
  return {
    problem_statement: str(fd, 'problem_statement'),
    quote: str(fd, 'quote'),
    workflow_step: str(fd, 'workflow_step'),
    evidence_type: str(fd, 'evidence_type') ?? 'Stated',
    severity: num(fd, 'severity'),
    frequency_text: str(fd, 'frequency_text'),
    frequency_per_month: num(fd, 'frequency_per_month'),
    time_spent_hours: num(fd, 'time_spent_hours'),
    cost_estimate: str(fd, 'cost_estimate'),
    current_solution: str(fd, 'current_solution'),
    workaround: str(fd, 'workaround'),
    tags: (str(fd, 'tags') ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    cluster_id: str(fd, 'cluster_id'),
  };
}

export async function saveObservation(interviewId: string, obsId: string | null, fd: FormData): Promise<ActionResult> {
  const row = observationFromForm(fd);
  if (!row.problem_statement) return { error: 'Problem statement is required.' };
  const supabase = await db();
  const { error } = obsId
    ? await supabase.from('observations').update(row).eq('id', obsId)
    : await supabase.from('observations').insert({ ...row, interview_id: interviewId });
  if (error) return { error: error.message };
  revalidatePath(`/interviews/${interviewId}`);
  revalidatePath('/observations');
  revalidatePath('/clusters', 'layout');
}

export async function deleteObservation(id: string, interviewId: string): Promise<ActionResult> {
  const supabase = await db();
  const { error } = await supabase.from('observations').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/interviews/${interviewId}`);
  revalidatePath('/observations');
  revalidatePath('/clusters', 'layout');
}

// Referral from an interview → new Target contact linked to interviewee + interview.
export async function addReferral(interviewId: string, referrerId: string, fd: FormData): Promise<ActionResult> {
  const name = str(fd, 'name');
  if (!name) return { error: 'Name is required.' };
  const supabase = await db();
  const { data: referrer } = await supabase.from('contacts').select('hunting_ground').eq('id', referrerId).single();
  const { error } = await supabase.from('contacts').insert({
    name,
    title: str(fd, 'title'),
    company: str(fd, 'company'),
    linkedin_url: str(fd, 'linkedin_url'),
    owner: str(fd, 'owner'),
    hunting_ground: referrer?.hunting_ground ?? null,
    source: 'Snowball referral',
    status: 'Target',
    referred_by: referrerId,
    referred_in_interview: interviewId,
    notes: str(fd, 'notes'),
  });
  if (error) return { error: error.message };
  revalidatePath(`/interviews/${interviewId}`);
  revalidatePath('/pipeline');
  revalidatePath('/');
}

// ───── AI suggestions: nothing is saved as an observation until a human approves it ─────

async function pending(supabase: Db, interviewId: string): Promise<PendingSuggestion[]> {
  const { data } = await supabase.from('interviews').select('ai_suggestions').eq('id', interviewId).single();
  const s = data?.ai_suggestions as AiSuggestions | null;
  return s?.status === 'done' ? s.items : [];
}

async function setPending(supabase: Db, interviewId: string, items: PendingSuggestion[]) {
  const value: AiSuggestions | null = items.length ? { status: 'done', items } : null;
  await supabase.from('interviews').update({ ai_suggestions: value }).eq('id', interviewId);
}

function suggestionRow(interviewId: string, { id: _id, ...o }: PendingSuggestion) {
  return { ...o, tags: o.tags.map((t) => t.toLowerCase()), interview_id: interviewId };
}

function revalidateObs(interviewId: string) {
  revalidatePath(`/interviews/${interviewId}`);
  revalidatePath('/observations');
  revalidatePath('/clusters', 'layout');
  revalidatePath('/');
}

export async function rerunSuggestions(interviewId: string): Promise<ActionResult> {
  const supabase = await db();
  await startSuggestions(supabase, interviewId);
  revalidatePath(`/interviews/${interviewId}`);
}

export async function approveSuggestion(interviewId: string, suggestionId: string, fd: FormData): Promise<ActionResult> {
  const row = observationFromForm(fd);
  if (!row.problem_statement) return { error: 'Problem statement is required.' };
  const supabase = await db();
  const { error } = await supabase.from('observations').insert({ ...row, interview_id: interviewId });
  if (error) return { error: error.message };
  await setPending(supabase, interviewId, (await pending(supabase, interviewId)).filter((p) => p.id !== suggestionId));
  revalidateObs(interviewId);
}

export async function dismissSuggestion(interviewId: string, suggestionId: string | null): Promise<ActionResult> {
  const supabase = await db();
  const items = suggestionId ? (await pending(supabase, interviewId)).filter((p) => p.id !== suggestionId) : [];
  await setPending(supabase, interviewId, items);
  revalidatePath(`/interviews/${interviewId}`);
}

export async function approveAllSuggestions(interviewId: string): Promise<ActionResult> {
  const supabase = await db();
  const items = await pending(supabase, interviewId);
  if (!items.length) return;
  const { error } = await supabase.from('observations').insert(items.map((p) => suggestionRow(interviewId, p)));
  if (error) return { error: error.message };
  await setPending(supabase, interviewId, []);
  revalidateObs(interviewId);
}
