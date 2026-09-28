# Discovery CRM

Internal CRM for Ron and Ronica's 6-week pharma customer-discovery sprint.
It covers outreach → interviews → observations → problem clusters → scoring.

Built with Next.js, Supabase (Postgres + auth) and Vercel. There are no AI features in v1.

---

## Deploy (about 20 minutes, once)

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
   - **Region: West EU (Ireland)**, for GDPR and so it's close to the app.
   - Save the database password somewhere safe.
2. **SQL Editor → New query**: paste all of `supabase/setup.sql` and click **Run**.
   - This creates the tables and security rules, and seeds the KPI targets and decision gates.
3. In a new query, add your two login emails to the team allowlist and click **Run**:
   ```sql
   insert into allowed_users (email) values ('ron@yourmail.com'), ('ronica@yourmail.com');
   ```
4. **Authentication → Sign In / Providers**:
   - Turn **off** "Allow new users to sign up".
   - Keep Email enabled.
5. **Authentication → Users → Add user → Create new user**.
   - Do this once for each of you: email plus password, with "Auto Confirm User" ticked.
   - The email must match the ones in `allowed_users`.
6. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key**.

> You're protected twice. Sign-up is off, and every table only lets the emails in `allowed_users` read or write, even if someone manages to create an account. To add or remove a person, edit that table in the SQL Editor:
> `insert into allowed_users values ('new@person.com');`

### 2. Vercel
1. Push this repo to GitHub. In Vercel: **Add New → Project → Import** the repo. The framework is detected as Next.js.
2. Add the two environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon / publishable key
3. Click **Deploy**. Open the URL, log in, and you're live.
   - `vercel.json` pins the server to Dublin (`dub1`), next to the database.

### Run locally (optional)
```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev                  # http://localhost:3000
```

---

## How we use it day to day

### Morning (5 min, each of us)
1. **Dashboard**: are we on pace for this week's outreach and interview targets?
   - Check "booked for next week" (target 12+).
   - Check the next decision gate.
2. **Pipeline → "Next actions due"**: work through anything red (overdue) in your name. Use the **owner filter** to see just your own.

### Outreach
- Add people with **+ Contact**, or bulk-load a list with **Import / Export → Import contacts**. Leave their status at **Target**.
- When you message someone, drag their card to **Contacted**. That stamps the outreach date, which is what the "Outreach sent" KPI counts.
- Always set **Next action + date** so they surface in the due list.
- When they book a slot, drag the card to **Scheduled** and enter the date and time when asked.
  - You can also set it later on the contact under "Interview booked for".
  - This slot feeds "booked for next week".
- Declined or no reply → drag the card to those columns at the far right.

### Right after each interview (aim for under 5 minutes, within 30 minutes of the call)
1. On the contact's card, click **+ Log interview**, or go to Interviews → + Log interview.
2. Fill in date, interviewers, workflow discussed and quick notes.
   - Tick **consent to record** only if they agreed. The Fathom link and transcript can't be saved without it.
   - Tick **logged within 30 min** if true.
3. Click **Save & add observations**. The same page now shows the observation form:
   - **One observation per distinct problem**, each with the problem, a verbatim quote, evidence type and severity.
   - Frequency, hours and cost are worth 20 seconds, because they drive scoring later.
   - **Evidence type** is what the entry bar hinges on:
     - *Stated* = they said it.
     - *Documented* = they showed an SOP, a spreadsheet or a ticket.
     - *Paid-for* = they already pay money (a vendor, a contractor, a headcount) to deal with it.
4. **Referrals given**: add each name they offered. Each one becomes a Target contact linked back to this interview, which feeds "referrals per interview".
5. The contact moves to **Interviewed** automatically. Set a Follow-up next action if needed.

The Fathom transcript can be pasted in later from the "Interview details" section on the same page.

### Weekly synthesis (Friday, together, about 45 min)
1. **Observations**: filter to "Unclustered". Tick related rows, then **Assign** to an existing cluster or **+ New cluster**.
2. **Clusters**: open each active cluster.
   - Read the quotes, then fill in the persona, the alternatives and the **seven 1–5 scores**.
   - The weighted score and the entry-bar badge update automatically.
   - Entry bar = ≥5 distinct interviewees, ≥2 companies and ≥1 Paid-for observation.
3. Mark the week's decision gate done on the Dashboard once you've made the call.
4. Set cluster status as you narrow down: Candidate → Shortlisted → Selected, or Dropped.

### GDPR
- When someone asks to be forgotten: open the contact and click **Delete contact + all data**.
  - This deletes their interviews, notes, transcripts, recording links and observations.
  - Anyone they referred is kept, and the link to them is removed.
  - **Also delete the recording in Fathom**, since this app only stores the link.
- If consent is withdrawn, untick consent on the interview and save. The transcript and link are erased.
- CSV exports contain personal data. Download them only when you need them, and delete them afterwards.
- The app only stores the fields listed in the brief, plus three operational ones:
  - the first-contacted date
  - the booked meeting time
  - which interview a referral came from

---

## How the numbers are computed

| KPI | Definition |
|---|---|
| Outreach sent (by date D) | Contacts whose `first_contacted_on` ≤ D. It's stamped automatically the first time status leaves Target. CSV imports use `last_touch_date` if present. |
| Interviews done | Interview records dated ≤ D |
| Booked for next week | Contacts (not Declined or No response) whose *interview booked for* falls in next Monday–Sunday |
| Referrals per interview | Contacts added via "Referrals given" ÷ number of interviews |
| Clusters with ≥3 interviewees / passing entry bar | Distinct contacts across the cluster's observations. Companies are compared case-insensitively. Dropped clusters are excluded. |
| Weighted score (0–5) | 25% paid-pain + 20% independent + 15% quantified cost + 15% AI economics + 10% owner/budget + 10% wedge + 5% × (6 − regulatory friction). Blank criteria count as 0, and the "n/7 scored" note shows how complete a score is. |

Dates are compared in UTC, so "today" rolls over at 01:00 Irish time and 03:00 Israeli time.

## Project layout
```
supabase/setup.sql    tables, constraints, computed cluster_stats view, RLS, seeded targets and gates
middleware.ts         redirects every request to /login unless signed in
app/                  one folder per screen (pipeline, interviews, observations, clusters, data)
app/api/export/       CSV export endpoint (auth required)
lib/options.ts        pick-list values (keep in sync with setup.sql check constraints)
```

## Phase 2 (not built)
"Paste transcript → suggested observations", where a human approves each suggestion before it's saved. We add it only after v1 has run for a couple of weeks.
