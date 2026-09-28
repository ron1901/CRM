'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase/server';

export async function toggleGate(id: string, done: boolean) {
  const supabase = await db();
  await supabase.from('gates').update({ done }).eq('id', id);
  revalidatePath('/');
}
