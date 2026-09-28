// Shared (browser + server) CSV → contact row normalisation. Header names match the contacts export.
import { COMPANY_TYPES, HUNTING_GROUNDS, OWNERS, SENIORITY, SOURCES, STATUSES } from './options';

export const CONTACT_CSV_COLUMNS = [
  'id', 'name', 'title', 'function', 'seniority', 'company', 'company_type', 'country', 'linkedin_url',
  'hunting_ground', 'source', 'referred_by_name', 'owner', 'status', 'first_contacted_on', 'meeting_at',
  'last_touch_date', 'next_action', 'next_action_date', 'notes',
] as const;

export type ContactImportRow = {
  id: string | null;
  referred_by_name: string | null;
  fields: Record<string, string | null>;
};

const ENUMS: Record<string, readonly string[]> = {
  seniority: SENIORITY,
  company_type: COMPANY_TYPES,
  hunting_ground: HUNTING_GROUNDS,
  source: SOURCES,
  owner: OWNERS,
  status: STATUSES,
};
const DATES = ['first_contacted_on', 'last_touch_date', 'next_action_date'];
const TEXT = ['name', 'title', 'function', 'company', 'country', 'linkedin_url', 'next_action', 'notes'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const key = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/^linkedin$/, 'linkedin_url').replace(/^referred_by$/, 'referred_by_name');

function toDate(v: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/); // European d.m.yyyy or d/m/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

export function normalizeContact(raw: Record<string, unknown>): { row: ContactImportRow; errors: string[] } {
  const r: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const s = v == null ? '' : String(v).trim();
    if (s !== '') r[key(k)] = s;
  }
  const errors: string[] = [];
  const fields: Record<string, string | null> = {};
  for (const f of TEXT) fields[f] = r[f] ?? null;
  if (!fields.name) errors.push('name is required');
  for (const [f, allowed] of Object.entries(ENUMS)) {
    if (!r[f]) { fields[f] = null; continue; }
    const hit = allowed.find((a) => a.toLowerCase() === r[f].toLowerCase());
    if (hit) fields[f] = hit;
    else { fields[f] = null; errors.push(`${f} "${r[f]}" not one of: ${allowed.join(', ')}`); }
  }
  if (!fields.status) fields.status = 'Target';
  for (const f of DATES) {
    if (!r[f]) { fields[f] = null; continue; }
    fields[f] = toDate(r[f]);
    if (!fields[f]) errors.push(`${f} "${r[f]}" is not a date (use YYYY-MM-DD)`);
  }
  if (r.meeting_at) {
    const d = new Date(r.meeting_at);
    if (isNaN(d.getTime())) errors.push(`meeting_at "${r.meeting_at}" is not a date-time`);
    fields.meeting_at = isNaN(d.getTime()) ? null : d.toISOString();
  } else fields.meeting_at = null;
  const id = r.id && UUID.test(r.id) ? r.id : null;
  if (r.id && !id) errors.push('id is not a valid UUID (leave blank for new contacts)');
  return { row: { id, referred_by_name: r.referred_by_name ?? null, fields }, errors };
}
