-- Seed: KPI targets and decision gates for the 6-week sprint. No contacts are seeded.
insert into kpi_targets (metric, due_date, target) values
  ('outreach_sent',   '2026-10-04', 100),
  ('outreach_sent',   '2026-10-11', 170),
  ('outreach_sent',   '2026-10-18', 200),
  ('outreach_sent',   '2026-10-25', 220),
  ('interviews_done', '2026-10-04', 6),
  ('interviews_done', '2026-10-11', 18),
  ('interviews_done', '2026-10-18', 30),
  ('interviews_done', '2026-10-25', 40);

insert into gates (date, title) values
  ('2026-10-11', 'Narrow hunting grounds'),
  ('2026-10-18', '2–3 candidate clusters'),
  ('2026-10-25', 'Pick one problem'),
  ('2026-11-01', 'Prototype check'),
  ('2026-11-08', 'Zell');

-- Team allowlist: replace with your two login emails.
insert into allowed_users (email) values
  ('ron@example.com'),
  ('ronica@example.com');
