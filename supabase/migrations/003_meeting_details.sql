-- Who from the team attends the booked interview, and the call link. Run once in Supabase → SQL Editor.
alter table contacts add column if not exists meeting_with text check (meeting_with in ('Ron','Ronica','Both'));
alter table contacts add column if not exists meeting_link text;
notify pgrst, 'reload schema';
