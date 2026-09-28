'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase/server';
import { normalizeContact } from '@/lib/contactCsv';

export type ImportResult = { error?: string; inserted?: number; updated?: number; skipped?: string[] };

export async function importContacts(rawRows: Record<string, unknown>[]): Promise<ImportResult> {
  const supabase = await db();
  const { data: existing, error } = await supabase.from('contacts').select('id,name,linkedin_url');
  if (error) return { error: error.message };
  const ids = new Set(existing.map((c) => c.id));
  const linkedins = new Set(existing.map((c) => c.linkedin_url?.toLowerCase().replace(/\/+$/, '')).filter(Boolean));
  const skipped: string[] = [];
  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; fields: Record<string, unknown> }[] = [];
  const referrals: { name: string; linkedin: string | null; id: string | null; referrer: string }[] = [];

  rawRows.forEach((raw, i) => {
    const { row, errors } = normalizeContact(raw);
    const label = `Row ${i + 2}${row.fields.name ? ` (${row.fields.name})` : ''}`;
    if (errors.length) return void skipped.push(`${label}: ${errors.join('; ')}`);
    if (row.id && ids.has(row.id)) updates.push({ id: row.id, fields: row.fields });
    else {
      const li = row.fields.linkedin_url?.toLowerCase().replace(/\/+$/, '');
      if (li && linkedins.has(li)) return void skipped.push(`${label}: LinkedIn URL already in CRM`);
      if (li) linkedins.add(li);
      inserts.push(row.fields);
    }
    if (row.referred_by_name) referrals.push({ name: row.fields.name!, linkedin: row.fields.linkedin_url, id: row.id, referrer: row.referred_by_name });
  });

  let inserted = 0;
  if (inserts.length) {
    const { data, error } = await supabase.from('contacts').insert(inserts).select('id');
    if (error) return { error: error.message };
    inserted = data.length;
  }
  for (const u of updates) {
    const { error } = await supabase.from('contacts').update(u.fields).eq('id', u.id);
    if (error) skipped.push(`${u.fields.name}: ${error.message}`);
  }

  // Resolve referred_by_name → contact id (exact, case-insensitive name match).
  if (referrals.length) {
    const { data: all } = await supabase.from('contacts').select('id,name,linkedin_url');
    const byName = new Map<string, string[]>();
    for (const c of all ?? []) {
      const k = c.name.toLowerCase().trim();
      byName.set(k, [...(byName.get(k) ?? []), c.id]);
    }
    for (const r of referrals) {
      const refIds = byName.get(r.referrer.toLowerCase().trim()) ?? [];
      if (refIds.length !== 1) { skipped.push(`${r.name}: referred_by "${r.referrer}" ${refIds.length ? 'is ambiguous' : 'not found'} — left blank`); continue; }
      const self = r.id ?? (all ?? []).find((c) => c.name === r.name && (c.linkedin_url ?? null) === (r.linkedin ?? null))?.id;
      if (self && self !== refIds[0]) await supabase.from('contacts').update({ referred_by: refIds[0] }).eq('id', self);
    }
  }
  revalidatePath('/', 'layout');
  return { inserted, updated: updates.length, skipped };
}
