-- ============================================================================
-- SUPABASE PENDING MIGRATIONS
-- Project: https://ttlrspnfadmxkoyqvofh.supabase.co
-- Run this entire file once in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ttlrspnfadmxkoyqvofh/sql/new
-- ============================================================================

-- ============================================================================
-- 1. Study Notes & Bookmarks Sync (tools/supabase-study-sync.sql)
-- Enables signed-in cloud sync of per-sheet study notes (baNote-*) and
-- bookmarks (baStudyBookmarks).
-- ============================================================================

create table if not exists public.exhibit_study_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notes jsonb not null default '{}'::jsonb,
  bookmarks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.exhibit_study_data enable row level security;

-- Learner can read and upsert their own study data row
drop policy if exists read_own_study_data on public.exhibit_study_data;
create policy read_own_study_data
  on public.exhibit_study_data for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists insert_own_study_data on public.exhibit_study_data;
create policy insert_own_study_data
  on public.exhibit_study_data for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists update_own_study_data on public.exhibit_study_data;
create policy update_own_study_data
  on public.exhibit_study_data for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Moderators / facilitators can inspect cohort study data
drop policy if exists moderator_read_study_data on public.exhibit_study_data;
create policy moderator_read_study_data
  on public.exhibit_study_data for select
  to authenticated
  using (
    exists (
      select 1 from pg_proc where proname = 'is_review_moderator'
    ) and public.is_review_moderator()
  );

grant select, insert, update on public.exhibit_study_data to authenticated;

create or replace function public.exhibit_study_data_rate_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and old.updated_at is not null
     and old.updated_at > now() - interval '6 seconds' then
    raise exception 'rate_limit';
  end if;
  return new;
end;
$$;

drop trigger if exists exhibit_study_data_rate_gate on public.exhibit_study_data;
create trigger exhibit_study_data_rate_gate
  before update on public.exhibit_study_data
  for each row execute procedure public.exhibit_study_data_rate_gate();


-- ============================================================================
-- 2. Checkpoint Quiz Integrity (tools/supabase-quiz-integrity.sql)
-- Stores checkpoint quiz keys on the server and provides verify_quiz_answer RPC.
-- ============================================================================

create table if not exists public.exhibit_quiz_keys (
  sitting smallint not null,
  q_idx smallint not null,
  correct_idx smallint not null check (correct_idx between 0 and 9),
  correct_note text not null default '',
  primary key (sitting, q_idx)
);

alter table public.exhibit_quiz_keys enable row level security;

-- The table is readable only through the security-definer function below.
revoke all on public.exhibit_quiz_keys from anon, authenticated, public;

create table if not exists public.exhibit_quiz_passes (
  user_id uuid not null references auth.users (id) on delete cascade,
  sitting smallint not null,
  q_idx smallint not null,
  passed_at timestamptz not null default now(),
  primary key (user_id, sitting, q_idx)
);

alter table public.exhibit_quiz_passes enable row level security;

revoke all on public.exhibit_quiz_passes from anon, authenticated, public;

create or replace function public.verify_quiz_answer(p_sitting int, p_q_idx int, p_chosen int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.exhibit_quiz_keys;
  v_correct boolean;
begin
  if p_chosen is null or p_chosen < 0 or p_chosen > 9
     or p_sitting is null or p_q_idx is null then
    return jsonb_build_object('correct', false, 'correct_idx', null, 'note', '', 'error', 'bad_input');
  end if;
  select * into v_key from public.exhibit_quiz_keys
    where sitting = p_sitting and q_idx = p_q_idx;
  if not found then
    return jsonb_build_object('correct', false, 'correct_idx', null, 'note', '', 'error', 'not_found');
  end if;
  v_correct := v_key.correct_idx = p_chosen;
  if v_correct and auth.uid() is not null then
    insert into public.exhibit_quiz_passes (user_id, sitting, q_idx)
    values (auth.uid(), p_sitting, p_q_idx)
    on conflict do nothing;
  end if;
  return jsonb_build_object(
    'correct', v_correct,
    'correct_idx', v_key.correct_idx,
    'note', case when v_correct then v_key.correct_note else '' end
  );
end;
$$;

revoke execute on function public.verify_quiz_answer(int, int, int) from anon, public;
grant execute on function public.verify_quiz_answer(int, int, int) to authenticated;

insert into public.exhibit_quiz_keys (sitting, q_idx, correct_idx, correct_note) values
  (0, 0, 1, 'Correct! Preterism parks the chain in antiquity; Daniel 2 still requires successive kingdoms culminating in God''s eternal kingdom.'),
  (0, 1, 3, 'Correct! Precedent in Torah and exile, then Daniel 9 tests the scale at the cross — 490 literal days fail, but 490 prophetic years fit precisely.'),
  (0, 2, 0, 'Correct! Futurism inserts a gap the text never prints; Daniel 2 runs gold to stone as one continuous chain.'),
  (0, 3, 2, 'Correct! The chain begins with the sovereign Lord, not with Babylonian military supremacy or pagan propaganda.'),
  (0, 4, 1, 'Correct! Sovereignty, the cross of Messiah, and the eternal Stone-King are the three Christological anchors of Daniel''s unbroken chain.'),
  (1, 0, 2, 'Correct! Daniel distinguished secular skill from covenant defilement, mastering civil statecraft while refusing idolatrous worship and dietary compromise.'),
  (1, 1, 0, 'Correct! Zeroim derives from zera (seed), echoing the original Genesis 1:29 diet to preserve moral, cognitive, and covenant clarity.'),
  (1, 2, 3, 'Correct! Belteshazzar carried a pagan theophoric stamp; Daniel''s true name and covenant identity remained anchored in the sovereign Judge.'),
  (1, 3, 1, 'Correct! God gave knowledge and skill; the test demonstrated that covenant loyalty to the Creator produces superior clarity without moral compromise.'),
  (1, 4, 0, 'Correct! Daniel''s purpose is a prophetic shadow; Christ''s sinless obedience in the wilderness is the substance that redeems and empowers us.'),
  (2, 0, 3, 'Correct! Daniel 2:38 uniquely anchors the head of gold to Babylon. Descent is contiguous and terminal; modern history exists in the divided feet of iron and clay.'),
  (2, 1, 1, 'Correct! The stone strikes suddenly ''without hands'' (supernatural, divine) and destroys human empires, establishing God''s everlasting kingdom.'),
  (2, 2, 0, 'Correct! The metals descend once, in chronological order, and culminate in Christ''s everlasting Stone kingdom — never in a cyclical reset.'),
  (2, 3, 2, 'Correct! ''They shall not cleave'' locks the fragmentation of post-Roman Europe: Charlemagne, Charles V, Napoleon, and modern treaties fail to reconstitute Rome''s unity.'),
  (2, 4, 3, 'Correct! ''Without hands'' designates divine, non-human origin. The strike is catastrophic and supernatural, establishing Christ''s eternal reign.'),
  (3, 0, 0, 'Correct! The second commandment (Exodus 20:4–5) forbids bowing before images; outward physical compliance cannot be justified by appealing to inward mental reservations.'),
  (3, 1, 2, 'Correct! In Daniel 2, Babylon was only the head of gold. Casting the whole colossus in gold defiantly proclaimed that Babylon would never yield to silver, brass, or iron.'),
  (3, 2, 1, 'Correct! The fiery furnace becomes a sanctuary of divine presence; Christ stands with His faithful witnesses in the hour of trial and persecution.'),
  (3, 3, 3, 'Correct! Civic peace and refused idolatry stand together: legitimate civil authority is respected, but state-enforced religious worship is steadfastly refused.'),
  (3, 4, 2, 'Correct! Typology runs through the furnace to the divine Substitute: Christ walks with us in trial because He took upon Himself the judgment due for sin.'),
  (4, 0, 1, 'Correct! Daniel 4 demonstrates that true human rationality is rooted in acknowledging Heaven''s rule; self-deifying pride degrades man to predatory bestiality.'),
  (4, 1, 0, 'Correct! Daniel 4:27 exemplifies true prophetic ministry: calling the monarch to active repentance, justice, and mercy, granting a 12-month reprieve.'),
  (4, 2, 3, 'Correct! Daniel 4:26 promises ''thy kingdom shall be sure unto thee, after that thou shalt have known that the heavens do rule.'' Mercy preserves the stump.'),
  (4, 3, 2, 'Correct! The numbered season serves the confession: Heaven rules. When the humbled monarch lifts his eyes to heaven, rational understanding is restored.'),
  (4, 4, 0, 'Correct! The true King descends in humble service; the proud monarch is degraded until he looks upward to acknowledge Heaven''s supreme rule.'),
  (5, 0, 2, 'Correct! Belshazzar''s sin was conscious sacrilege: knowing Nebuchadnezzar''s humbling, he deliberately used Yahweh''s holy vessels to toast lifeless idols.'),
  (5, 1, 3, 'Correct! Isaiah 45:1 named Cyrus and foretold the open two-leaved river gates; the writing on the plaster announced the exact night the empire was divided.'),
  (5, 2, 1, 'Correct! The writing on the plaster is a divine courtroom verdict: God weighs kings and empires not by wealth, but by the righteous scale of Heaven.'),
  (5, 3, 0, 'Correct! Knowing how Heaven humbled Nebuchadnezzar, Belshazzar chose deliberate sacrilege; light rejected brings swift judicial reckoning.'),
  (5, 4, 1, 'Correct! Christ is both the sovereign Judge to whom all judgment is committed and the sole Redeemer whose perfect righteousness covers our moral deficit.'),
  (6, 0, 3, 'Correct! Daniel knew the decree was signed and altered nothing. Conceding state jurisdiction over prayer to the Creator would constitute covenant betrayal.'),
  (6, 1, 2, 'Correct! Daniel 6 provides an unmistakable type of Christ''s resurrection: an innocent servant sealed under death''s stone, emerging triumphant at dawn.'),
  (6, 2, 0, 'Correct! The irreversible legal seal sets the stage for the resurrection type: human law decrees death, but Heaven''s power triumphs over the sealed pit.'),
  (6, 3, 1, 'Correct! Solomon''s prayer (1 Kings 8) and Daniel''s open windows agree: exiles maintain faith by orienting toward the place of God''s covenant presence.'),
  (6, 4, 3, 'Correct! The unbreakable kingdom and the living God are proclaimed because the sealed pit could not hold the innocent servant—a vivid type of Christ''s triumph.'),
  (7, 0, 0, 'Correct! Daniel 7:17, 23 and related biblical texts (Rev 17:15, Jer 49:36) define the symbols: beasts are kingdoms arising from warring human populations.'),
  (7, 1, 3, 'Correct! Daniel 7:9–14 depicts a pre-advent investigative court in heaven: the Son of Man approaches the Father to receive vindication and the kingdom.'),
  (7, 2, 2, 'Correct! Using biblical reckoning (360-day prophetic year) and the year-day principle (Ezek 4:6, Num 14:34), the 1,260 days span 1,260 years from A.D. 538 to 1798.'),
  (7, 3, 1, 'Correct! Daniel 7 recapitulates Daniel 2 using living predatory symbols, adding moral texture and focusing on the little horn arising from Rome''s division.'),
  (7, 4, 2, 'Correct! The Son of Man moves TO the Father in heaven to receive the everlasting kingdom and vindicate His saints prior to His visible return to earth.'),
  (8, 0, 1, 'Correct! Ereb boqer reflects the creation day formula; Gabriel''s declaration that the vision reaches to the ''time of the end'' disproves the 3-year Antiochus view.'),
  (8, 1, 2, 'Correct! Strong''s H6663 (nitsdaq) is forensic (justified, vindicated); it points to the cosmic Day of Atonement vindicating God''s sanctuary and people.'),
  (8, 2, 3, 'Correct! Gabriel interprets the symbols within the chapter itself: Media-Persia is succeeded by Greece, Alexander falls, and four Hellenistic horns arise.'),
  (8, 3, 0, 'Correct! The little horn waxes ''exceeding great'' (surpassing Persia and Greece), attacks Christ the Prince, and extends to the ''time of the end'' (Dan 8:17).'),
  (8, 4, 2, 'Correct! The earthly tabernacle was a copy; the true heavenly sanctuary where Christ mediates is cleansed and vindicated at the close of the 2,300 prophetic days.'),
  (9, 0, 2, 'Correct! Gabriel returns to explain ''the vision'' (the unexplained 2,300 days of Daniel 8:14, 27); chathak proves the 70 weeks are cut off from that longer span.'),
  (9, 1, 0, 'Correct! Messiah is the antecedent: Christ confirmed the covenant and ended animal sacrifices by His sacrificial death in the midst of the 70th week (A.D. 31).'),
  (9, 2, 1, 'Correct! The decree of Artaxerxes I in his 7th year (457 B.C., Ezra 7) restored the city, walls, and civil polity, fulfilling Daniel 9:25.'),
  (9, 3, 3, 'Correct! 483 years starting in the autumn of 457 B.C. reach the autumn of A.D. 27 (accounting for no year zero), when Jesus was baptized and began His ministry.'),
  (9, 4, 1, 'Correct! In the midst of the 70th week (3.5 years after A.D. 27), Christ was crucified in Spring A.D. 31, ending the validity of animal sacrifices forever.'),
  (10, 0, 3, 'Correct! ''Stand up'' is Daniel''s royal verb for assuming kingly power. When Michael stands, high-priestly intercession closes, leading to the time of trouble.'),
  (10, 1, 1, 'Correct! Daniel 12:2, 13 provides the clearest Hebrew Bible proof of literal bodily resurrection: waking from the dust of the earth to everlasting life.'),
  (10, 2, 0, 'Correct! Daniel 12:1–2 is sequential: Michael stands up (probation closes), trouble comes, the saints in the book are delivered, and the resurrection occurs.'),
  (10, 3, 2, 'Correct! Daniel 12:1 specifies: ''every one that shall be found written in the book.'' Covenant citizenship in Heaven decides eternal destiny.'),
  (10, 4, 0, 'Correct! The last sitting commissions wise teachers: the prophecies unseal at the time of the end to anchor faith and turn many to righteousness.')
on conflict (sitting, q_idx) do update
  set correct_idx = excluded.correct_idx,
      correct_note = excluded.correct_note;

alter table public.exhibit_study_data
  drop constraint if exists exhibit_study_data_notes_size,
  drop constraint if exists exhibit_study_data_bookmarks_size;
alter table public.exhibit_study_data
  add constraint exhibit_study_data_notes_size
    check (octet_length(notes::text) <= 1228800) not valid,
  add constraint exhibit_study_data_bookmarks_size
    check (octet_length(bookmarks::text) <= 65536) not valid;

-- ============================================================================
-- 3. Certificates From Server-Recorded Quiz Passes (tools/supabase-certificates.sql)
-- Issues certificates and lists graduates from exhibit_quiz_passes instead of the
-- browser-saved journey, and backfills passes once for existing readers. Run after section 2.
-- ============================================================================

begin;

create table if not exists public.exhibit_certificates (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique check (serial ~ '^SD-[0-9]{4}-[0-9A-F]{8}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  issued_at timestamptz not null default now()
);

create index if not exists exhibit_certificates_user_idx
  on public.exhibit_certificates (user_id, issued_at desc);

alter table public.exhibit_certificates enable row level security;

create or replace function public.exhibit_sittings_finished(p_journey jsonb)
returns integer
language sql
immutable
set search_path = public
as $$
  select count(distinct s.n)::integer
  from (
    select case when v ~ '^[0-9]{1,2}$' then v::integer end as n
    from jsonb_array_elements_text(
      case when jsonb_typeof(p_journey -> 'completedSheets') = 'array'
        then p_journey -> 'completedSheets'
        else '[]'::jsonb
      end
    ) v
  ) s
  where s.n between 0 and 10;
$$;

create or replace function public.exhibit_sittings_passed(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from (
    select k.sitting
    from public.exhibit_quiz_keys k
    left join public.exhibit_quiz_passes q
      on q.user_id = p_user and q.sitting = k.sitting and q.q_idx = k.q_idx
    group by k.sitting
    having count(q.q_idx) = count(*)
  ) s;
$$;

create table if not exists public.exhibit_migrations (
  name text primary key,
  ran_at timestamptz not null default now()
);

alter table public.exhibit_migrations enable row level security;

revoke all on public.exhibit_migrations from public, anon, authenticated;

do $$
begin
  insert into public.exhibit_migrations (name) values ('quiz_passes_backfill')
  on conflict do nothing;
  if not found then
    return;
  end if;
  insert into public.exhibit_quiz_passes (user_id, sitting, q_idx)
  select p.user_id, k.sitting, k.q_idx
  from public.exhibit_progress p
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(p.journey -> 'completedSheets') = 'array'
      then p.journey -> 'completedSheets'
      else '[]'::jsonb
    end
  ) v
  join public.exhibit_quiz_keys k
    on k.sitting = case when v.value ~ '^[0-9]{1,2}$' then v.value::integer end
  on conflict do nothing;
  insert into public.exhibit_quiz_passes (user_id, sitting, q_idx)
  select c.user_id, k.sitting, k.q_idx
  from (select distinct user_id from public.exhibit_certificates) c
  cross join public.exhibit_quiz_keys k
  on conflict do nothing;
end;
$$;

create or replace function public.issue_exhibit_certificate(p_name text)
returns table (
  serial text,
  name text,
  issued_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
#variable_conflict use_column
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_finished integer;
  v_recent integer;
  v_row public.exhibit_certificates;
  v_tries integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not_allowed';
  end if;
  if char_length(v_name) not between 1 and 80 then
    raise exception 'bad_name';
  end if;
  v_finished := public.exhibit_sittings_passed(auth.uid());
  if coalesce(v_finished, 0) < 11 then
    raise exception 'not_finished';
  end if;
  select c.* into v_row
  from public.exhibit_certificates c
  where c.user_id = auth.uid() and c.name = v_name
  order by c.issued_at desc
  limit 1;
  if found then
    return query select v_row.serial, v_row.name, v_row.issued_at;
    return;
  end if;
  select count(*) into v_recent
  from public.exhibit_certificates c
  where c.user_id = auth.uid()
    and c.issued_at > now() - interval '1 day';
  if v_recent >= 5 then
    raise exception 'rate_limit';
  end if;
  loop
    begin
      insert into public.exhibit_certificates (serial, user_id, name)
      values (
        'SD-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 8)),
        auth.uid(),
        v_name
      )
      returning * into v_row;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 3 then
        raise;
      end if;
    end;
  end loop;
  return query select v_row.serial, v_row.name, v_row.issued_at;
end;
$$;

create or replace function public.exhibit_graduates()
returns table (
  user_id uuid,
  email text,
  certificate_name text,
  sittings integer,
  last_active timestamptz,
  serial text,
  issued_at timestamptz,
  certificates integer,
  first_download_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.user_id,
    case when u.email_confirmed_at is not null then u.email else null end,
    coalesce(nullif(btrim(c.name), ''), nullif(btrim(p.certificate_name), '')),
    public.exhibit_sittings_passed(p.user_id),
    p.updated_at,
    c.serial,
    c.issued_at,
    cc.n::integer,
    d.first_at
  from public.exhibit_progress p
  join auth.users u on u.id = p.user_id
  left join lateral (
    select c1.serial, c1.name, c1.issued_at
    from public.exhibit_certificates c1
    where c1.user_id = p.user_id
    order by c1.issued_at desc
    limit 1
  ) c on true
  cross join lateral (
    select count(*) as n
    from public.exhibit_certificates c2
    where c2.user_id = p.user_id
  ) cc
  cross join lateral (
    select min(e.created_at) as first_at
    from public.exhibit_events e
    where e.user_id = p.user_id
      and e.event = 'feature_use'
      and e.detail ->> 'feature' = 'cert_download'
  ) d
  where public.is_review_moderator()
    and (public.exhibit_sittings_passed(p.user_id) >= 11 or c.serial is not null)
  order by coalesce(c.issued_at, p.updated_at) desc
  limit 2000;
$$;

revoke all on public.exhibit_certificates from public, anon, authenticated;

revoke all on function public.exhibit_sittings_finished(jsonb) from public, anon, authenticated;
revoke all on function public.exhibit_sittings_passed(uuid) from public, anon, authenticated;
revoke all on function public.issue_exhibit_certificate(text) from public, anon, authenticated;
revoke all on function public.exhibit_graduates() from public, anon, authenticated;
grant execute on function public.issue_exhibit_certificate(text) to authenticated;
grant execute on function public.exhibit_graduates() to authenticated;

notify pgrst, 'reload schema';

commit;

-- ============================================================================
-- 4. Account Deletion (tools/supabase-account-deletion.sql)
-- Lets a signed-in reader delete their account and every row tied to it through
-- exhibit_delete_my_account(). Run after sections 1 to 3 and the setup files above.
-- ============================================================================

begin;

create or replace function public.exhibit_help_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_review_moderator()
     and not (coalesce(current_setting('exhibit.account_delete', true), '') = '1'
              and auth.uid() is not null
              and old.user_id = auth.uid()) then
    raise exception 'not_allowed';
  end if;
  return old;
end;
$$;

create or replace function public.exhibit_delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  if exists (select 1 from public.exhibit_notices where author_id = v_uid) then
    raise exception 'operator_account';
  end if;

  select lower(btrim(u.email)) into v_email
    from auth.users u
   where u.id = v_uid;

  perform set_config('exhibit.account_delete', '1', true);

  delete from public.exhibit_help_replies where author_id = v_uid;
  delete from public.exhibit_help_notes where user_id = v_uid;
  delete from public.exhibit_notice_receipts where user_id = v_uid;
  delete from public.exhibit_reviews where user_id = v_uid;
  delete from public.exhibit_surveys where user_id = v_uid;
  delete from public.exhibit_certificates where user_id = v_uid;
  delete from public.exhibit_quiz_passes where user_id = v_uid;
  delete from public.exhibit_study_data where user_id = v_uid;
  delete from public.exhibit_progress where user_id = v_uid;
  delete from public.exhibit_profiles where user_id = v_uid;
  delete from public.exhibit_password_failures where user_id = v_uid;

  update public.exhibit_events
     set user_id = null,
         anon_id = '',
         session_id = ''
   where user_id = v_uid;

  if v_email is not null then
    delete from public.exhibit_moderators where email = v_email;
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.exhibit_delete_my_account() from public, anon;
grant execute on function public.exhibit_delete_my_account() to authenticated;

notify pgrst, 'reload schema';

commit;

-- ============================================================================
-- 5. Survey Read Lock (tools/supabase-survey-read-lock.sql)
-- Signed-out callers keep insert on exhibit_surveys and lose select.
-- The moderator two-step rule (tools/supabase-moderator-require-mfa.sql) is not
-- here on purpose: run it by itself once the operator's authenticator is verified.
-- ============================================================================

begin;

revoke select on public.exhibit_surveys from anon, public;
grant select, insert on public.exhibit_surveys to authenticated;
grant insert on public.exhibit_surveys to anon;

commit;
