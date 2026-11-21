-- TEMAN — Theme presets + profile background color
-- Review this migration before running it in Supabase SQL Editor.
--
-- Adds two columns to public.profiles. No new tables are created.

alter table public.profiles
  add column if not exists theme_preset text not null default 'teman';

alter table public.profiles
  add column if not exists profile_background_color text;

-- Backfill any pre-existing NULL values (defensive).
update public.profiles
set theme_preset = 'teman'
where theme_preset is null;

-- CHECK constraint for valid preset ids.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_theme_preset_check'
  ) then
    alter table public.profiles
      add constraint profiles_theme_preset_check
      check (theme_preset in (
        'teman',
        'tokyo-night',
        'codex',
        'linear',
        'github',
        'nord',
        'dracula'
      ));
  end if;
end
$$;

-- CHECK constraint for #RRGGBB hex color (or NULL).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_profile_background_color_check'
  ) then
    alter table public.profiles
      add constraint profiles_profile_background_color_check
      check (
        profile_background_color is null
        or profile_background_color ~ '^#[0-9A-Fa-f]{6}$'
      );
  end if;
end
$$;

-- Grant only the two preference columns. RLS below restricts updates to the
-- authenticated user's own profile row.
grant update (theme_preset, profile_background_color)
  on public.profiles to authenticated;

alter table public.profiles enable row level security;

-- RLS: users may update only their own profile preferences.
-- This does not grant access to other users' rows.
drop policy if exists "profiles_update_own_preferences" on public.profiles;
create policy "profiles_update_own_preferences"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- A restrictive policy also prevents any existing permissive UPDATE policy
-- from allowing authenticated users to update another profile.
drop policy if exists "profiles_update_own_preferences_restrictive" on public.profiles;
create policy "profiles_update_own_preferences_restrictive"
  on public.profiles
  as restrictive
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

comment on column public.profiles.theme_preset is
  'Selected color theme preset id (teman, tokyo-night, codex, linear, github, nord, dracula).';
comment on column public.profiles.profile_background_color is
  'Optional HEX color (#RRGGBB) for the user profile identity area. NULL means default.';

notify pgrst, 'reload schema';