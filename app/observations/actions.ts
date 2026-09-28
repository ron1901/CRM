'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';

// clusterId '' + no newName = unassign.
export async function assignCluster(ids: string[], clusterId: string, newName: string): Promise<ActionResult> {
  if (ids.length === 0) return { error: 'Select at least one observation.' };
  const supabase = await db();
  let target: string | null = clusterId || null;
  if (newName.trim()) {
    const { data, error } = await supabase.from('clusters').insert({ name: newName.trim() }).select('id').single();
    if (error) return { error: error.message };
    target = data.id;
  }
  const { error } = await supabase.from('observations').update({ cluster_id: target }).in('id', ids);
  if (error) return { error: error.message };
  revalidatePath('/observations');
  revalidatePath('/clusters', 'layout');
  revalidatePath('/');
}
