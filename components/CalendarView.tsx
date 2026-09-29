'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { cancelMeeting } from '@/app/calendar/actions';
import { DeleteButton } from './DeleteButton';

export type CalMeeting = {
  id: string; // contact id
  name: string;
  title: string | null;
  company: string | null;
  owner: string | null;
  status: string;
  meeting_at: string;
  meeting_with: string | null;
  meeting_link: string | null;
  logged: boolean;
};
type Gate = { id: string; date: string; title: string; done: boolean };

const WHO_STYLE: Record<string, string> = {
  Ron: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/40',
  Ronica: 'bg-fuchsia-400/15 text-fuchsia-200 border-fuchsia-400/40',
  Both: 'bg-violet-400/15 text-violet-200 border-violet-400/40',
};

// Everything below runs in the viewer's timezone (Dublin or Tel Aviv).
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function CalendarView({ meetings, gates }: { meetings: CalMeeting[]; gates: Gate[] }) {
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [who, setWho] = useState('');
  useEffect(() => setWeekStart(mondayOf(new Date())), []);

  const visible = useMemo(
    () => meetings.filter((m) => {
      const w = m.meeting_with ?? m.owner;
      return !who || w === who || w === 'Both';
    }),
    [meetings, who],
  );

  if (!weekStart) return <div className="card h-64 animate-pulse" />;

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = dayKey(new Date());
  const now = Date.now();
  const inWeek = visible.filter((m) => {
    const t = new Date(m.meeting_at);
    return t >= weekStart && t < addDays(weekStart, 7);
  });
  const fmtRange = `${days[0].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>←</button>
        <button className="btn-ghost" onClick={() => setWeekStart(mondayOf(new Date()))}>This week</button>
        <button className="btn-ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>→</button>
        <span className="font-display text-lg font-semibold">{fmtRange}</span>
        <span className="text-slate-400">· {inWeek.length} meeting{inWeek.length === 1 ? '' : 's'}</span>
        <select className="input ml-auto max-w-44" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">Everyone</option>
          <option value="Ron">Ron’s meetings</option>
          <option value="Ronica">Ronica’s meetings</option>
        </select>
      </div>

      <div className="grid gap-2 md:grid-cols-7">
        {days.map((d) => {
          const key = dayKey(d);
          const isToday = key === todayKey;
          const dayMeetings = inWeek
            .filter((m) => dayKey(new Date(m.meeting_at)) === key)
            .sort((a, b) => a.meeting_at.localeCompare(b.meeting_at));
          const dayGates = gates.filter((g) => g.date === key);
          return (
            <div
              key={key}
              className={`min-h-40 rounded-xl border p-2 backdrop-blur ${
                isToday ? 'border-cyan-400/50 bg-cyan-400/[0.06] shadow-[0_0_24px_-10px_rgba(34,211,238,0.7)]' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className={`mb-2 flex items-baseline justify-between text-xs uppercase tracking-wider ${isToday ? 'text-cyan-300' : 'text-slate-400'}`}>
                <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <span className="font-display text-base">{d.getDate()}</span>
              </div>
              <div className="space-y-1.5">
                {dayGates.map((g) => (
                  <div key={g.id} className={`rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs text-amber-200 ${g.done ? 'line-through opacity-60' : ''}`}>
                    ◆ {g.title}
                  </div>
                ))}
                {dayMeetings.map((m) => {
                  const w = m.meeting_with ?? m.owner;
                  const past = new Date(m.meeting_at).getTime() < now;
                  return (
                    <div key={m.id} className={`rounded-lg border p-2 text-xs ${WHO_STYLE[w ?? ''] ?? 'border-white/15 bg-white/5'} ${past ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display text-sm font-semibold text-white">
                          {new Date(m.meeting_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {w && <span className="rounded-full bg-black/30 px-1.5">{w}</span>}
                      </div>
                      <Link href={`/contacts/${m.id}`} className="block font-medium text-white hover:underline">{m.name}</Link>
                      <div className="text-slate-300">{[m.title, m.company].filter(Boolean).join(' · ')}</div>
                      <div className="mt-1 flex flex-wrap gap-x-2">
                        {m.meeting_link && !past && <a href={m.meeting_link} target="_blank" rel="noreferrer" className="link">Join ↗</a>}
                        {past && !m.logged && <Link href={`/interviews/new?contact=${m.id}`} className="link">+ Log interview</Link>}
                        {past && m.logged && <span className="text-emerald-300">✓ logged</span>}
                        {!past && (
                          <DeleteButton
                            action={cancelMeeting.bind(null, m.id)}
                            confirmText={`Cancel the meeting with ${m.name}?`}
                            label="cancel"
                            className="text-rose-300 hover:underline"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400">
        Times are shown in your own timezone. Colours: <span className="text-cyan-300">Ron</span> · <span className="text-fuchsia-300">Ronica</span> ·{' '}
        <span className="text-violet-300">Both</span>. If “who from us” is empty, the contact’s owner is used.
      </p>
    </div>
  );
}
