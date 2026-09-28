'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase/server';

export async function login(fd: FormData) {
  const supabase = await db();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(fd.get('email') ?? ''),
    password: String(fd.get('password') ?? ''),
  });
  if (error) redirect('/login?error=' + encodeURIComponent(error.message));
  redirect('/');
}

export async function logout() {
  const supabase = await db();
  await supabase.auth.signOut();
  redirect('/login');
}
