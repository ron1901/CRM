'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase/server';
import { str, today } from '@/lib/form';
import { STATUSES } from '@/lib/options';
import type { ActionResult } from '@/lib/types';

function contactFromForm(fd: FormData) {
  return {
    name: str(fd, 'name'),
    title: str(fd, 'title'),
    function: str(fd, 'function'),
    seniority: str(fd, 'seniority'),
    company: str(fd, 'company'),
    company_type: str(fd, 'company_type'),
    country: str(fd, 'country'),
    linkedin_url: str(fd, 'linkedin_url'),
    hunting_ground: str(fd, 'hunting_ground'),
    source: str(fd, 'source'),
    referred_by: str(fd, 'referred_by'),
    owner: str(fd, 'owner'),
    status: str(fd, 'status') ?? 'Target',
    meeting_at: str(fd, 'meeting_at'),
    last_touch_date: str(fd, 'last_touch_date'),
    next_action: str(fd, 'next_action'),
    next_action_date: str(fd, 'next_action_date'),
    notes: str(fd, 'notes'),
  };
}

export async function saveContact(id: string | null, fd: FormData): Promise<ActionResult> {
  const row = contactFromForm(fd);
  if (!row.name) return { error: 'Name is required.' };
  const supabase = await db();
  const res = id
    ? await supabase.from('contacts').update(row).eq('id', id).select('id').single()
    : await supabase.from('contacts').insert(row).select('id').single();
  if (res.error) return { error: res.error.message };
  revalidatePath('/pipeline');
  revalidatePath('/');
  redirect(id ? '/pipeline' : `/contacts/${res.data.id}?created=1`);
}

export async function updateStatus(id: string, status: string, meetingAt?: string | null): Promise<ActionResult> {
  if (!(STATUSES as readonly string[]).includes(status)) return { error: 'Unknown status' };
  const patch: Record<string, unknown> = { status };
  if (status !== 'Target') patch.last_touch_date = today();
  if (meetingAt) patch.meeting_at = meetingAt;
  const supabase = await db();
  const { error } = await supabase.from('contacts').update(patch).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/pipeline');
  revalidatePath('/');
}

// GDPR erasure: interviews (incl. transcript + recording link) and their observations cascade in the database.
export async function deleteContact(id: string): Promise<ActionResult> {
  const supabase = await db();
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  redirect('/pipeline');
}
