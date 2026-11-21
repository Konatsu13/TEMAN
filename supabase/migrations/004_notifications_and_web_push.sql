create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.generate_upcoming_notifications()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_inserted integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('teman_upcoming_notifications'));

  with candidates as (
    select
      recipients.user_id,
      'deadline'::public.notification_type as type,
      'Deadline lomba mendekat'::text as title,
      'Deadline "' || competition.name || '" kurang dari 24 jam lagi.'::text as body,
      competition.id as competition_id,
      null::uuid as task_id,
      'reminder:competition:' || competition.id || ':' || recipients.user_id as dedupe_key
    from public.competitions competition
    cross join lateral (
      select member.user_id
      from public.competition_members member
      where member.competition_id = competition.id
      union
      select competition.created_by
      where competition.created_by is not null
    ) recipients
    join public.profiles profile
      on profile.id = recipients.user_id
      and profile.is_active = true
    where competition.deadline >= v_now
      and competition.deadline < v_now + interval '24 hours'
      and competition.status in ('planning', 'active')

    union all

    select
      recipients.user_id,
      'deadline'::public.notification_type,
      'Deadline tugas mendekat',
      'Tugas "' || task.title || '" jatuh tempo dalam 24 jam.',
      task.competition_id,
      task.id,
      'reminder:task:' || task.id || ':' || recipients.user_id
    from public.tasks task
    cross join lateral (
      select task.assignee_id as user_id
      where task.assignee_id is not null
      union
      select member.user_id
      from public.competition_members member
      where member.competition_id = task.competition_id
        and task.assignee_id is null
      union
      select task.created_by
      where task.created_by is not null
    ) recipients
    join public.profiles profile
      on profile.id = recipients.user_id
      and profile.is_active = true
    where task.due_date >= v_now
      and task.due_date < v_now + interval '24 hours'
      and task.status <> 'done'

    union all

    select
      recipients.user_id,
      'deadline'::public.notification_type,
      'Jadwal segera dimulai',
      'Jadwal "' || event.title || '" dimulai dalam 24 jam.',
      event.competition_id,
      null::uuid,
      'reminder:calendar:' || event.id || ':' || recipients.user_id
    from public.calendar_events event
    cross join lateral (
      select member.user_id
      from public.competition_members member
      where member.competition_id = event.competition_id
      union
      select event.created_by
      where event.created_by is not null
      union
      select profile.id
      from public.profiles profile
      where event.competition_id is null
        and profile.is_active = true
    ) recipients
    join public.profiles profile
      on profile.id = recipients.user_id
      and profile.is_active = true
    where event.starts_at >= v_now
      and event.starts_at < v_now + interval '24 hours'
  )
  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    competition_id,
    task_id,
    dedupe_key
  )
  select
    candidate.user_id,
    candidate.type,
    candidate.title,
    candidate.body,
    candidate.competition_id,
    candidate.task_id,
    candidate.dedupe_key
  from candidates candidate
  where not exists (
    select 1
    from public.notifications existing
    where existing.user_id = candidate.user_id
      and existing.dedupe_key = candidate.dedupe_key
  );

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.generate_upcoming_notifications() from public, anon, authenticated;
grant execute on function public.generate_upcoming_notifications() to service_role;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'teman-upcoming-notifications'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'teman-upcoming-notifications',
    '*/5 * * * *',
    'select public.generate_upcoming_notifications();'
  );
end;
$$;

create or replace function public.dispatch_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_function_url text;
  v_service_role_key text;
begin
  if new.pushed_at is not null then
    return new;
  end if;

  if to_regclass('vault.decrypted_secrets') is null then
    raise warning 'Supabase Vault belum aktif; notifikasi in-app tersimpan, tetapi Web Push tidak dikirim.';
    return new;
  end if;

  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1'
    into v_function_url
    using 'teman_push_function_url';
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1'
    into v_service_role_key
    using 'teman_push_service_role_key';

  if coalesce(v_function_url, '') = '' or coalesce(v_service_role_key, '') = '' then
    raise warning 'Secret Web Push belum diatur di Supabase Vault; notifikasi in-app tersimpan tanpa Web Push.';
    return new;
  end if;

  execute
    'select net.http_post($1, $2, ''{}''::jsonb, $3, 5000)'
    using
      v_function_url,
      jsonb_build_object('notification_id', new.id),
      jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      );

  return new;
exception
  when others then
    raise warning 'Dispatch Web Push gagal untuk notification %: %', new.id, sqlerrm;
    return new;
end;
$$;

revoke all on function public.dispatch_notification_push() from public, anon, authenticated;

drop trigger if exists notifications_dispatch_push on public.notifications;
create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row
  when (new.pushed_at is null)
  execute function public.dispatch_notification_push();
