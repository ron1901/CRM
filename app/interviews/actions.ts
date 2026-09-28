'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase/server';
import { bool, num, str } from '@/lib/form';
import type { ActionResult } from '@/lib/types';

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
    const { error } = await supabase.from('interviews').update(row).eq('id', id);
    if (error) return { error: error.message };
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
