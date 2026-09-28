'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase/server';
import { num, str } from '@/lib/form';
import { SCORE_CRITERIA } from '@/lib/options';
import type { ActionResult } from '@/lib/types';

export async function createCluster(fd: FormData): Promise<ActionResult> {
  const name = str(fd, 'name');
  if (!name) return { error: 'Name is required.' };
  const supabase = await db();
  const { data, error } = await supabase.from('clusters').insert({ name, hunting_ground: str(fd, 'hunting_ground') }).select('id').single();
  if (error) return { error: error.message };
  revalidatePath('/clusters');
  redirect(`/clusters/${data.id}`);
}

export async function saveCluster(id: string, fd: FormData): Promise<ActionResult> {
  const row: Record<string, unknown> = {
    name: str(fd, 'name'),
    description: str(fd, 'description'),
    hunting_ground: str(fd, 'hunting_ground'),
    owner_persona: str(fd, 'owner_persona'),
    competitors_alternatives: str(fd, 'competitors_alternatives'),
    status: str(fd, 'status') ?? 'Candidate',
  };
  if (!row.name) return { error: 'Name is required.' };
  for (const c of SCORE_CRITERIA) row[c.key] = num(fd, c.key);
  const supabase = await db();
  const { error } = await supabase.from('clusters').update(row).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/clusters', 'layout');
  revalidatePath('/');
}

export async function deleteCluster(id: string): Promise<ActionResult> {
  const supabase = await db();
  const { error } = await supabase.from('clusters').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  redirect('/clusters');
}

export async function unassignObservation(obsId: string, clusterId: string): Promise<ActionResult> {
  const supabase = await db();
  const { error } = await supabase.from('observations').update({ cluster_id: null }).eq('id', obsId);
  if (error) return { error: error.message };
  revalidatePath(`/clusters/${clusterId}`);
  revalidatePath('/clusters');
  revalidatePath('/observations');
}
