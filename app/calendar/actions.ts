'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase/server';
import { str, today } from '@/lib/form';
import type { ActionResult } from '@/lib/types';

const BEFORE_SCHEDULED = ['Target', 'Contacted', 'Replied'];

function refresh() {
  revalidatePath('/calendar');
  revalidatePath('/pipeline');
  revalidatePath('/');
}

export async function scheduleMeeting(fd: FormData): Promise<ActionResult> {
  const contactId = str(fd, 'contact_id');
  const meetingAt = str(fd, 'meeting_at');
  if (!contactId || !meetingAt) return { error: 'Pick a contact and a date/time.' };
  const supabase = await db();
  const { data: c, error: readErr } = await supabase.from('contacts').select('status').eq('id', contactId).single();
  if (readErr) return { error: readErr.message };
  const patch: Record<string, unknown> = {
    meeting_at: meetingAt,
    meeting_with: str(fd, 'meeting_with'),
    meeting_link: str(fd, 'meeting_link'),
    last_touch_date: today(),
  };
  if (BEFORE_SCHEDULED.includes(c.status)) patch.status = 'Scheduled';
  const { error } = await supabase.from('contacts').update(patch).eq('id', contactId);
  if (error) return { error: error.message };
  refresh();
}

export async function cancelMeeting(contactId: string): Promise<ActionResult> {
  const supabase = await db();
  const { error } = await supabase.from('contacts').update({ meeting_at: null, meeting_link: null }).eq('id', contactId);
  if (error) return { error: error.message };
  refresh();
}
