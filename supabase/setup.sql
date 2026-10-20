-- ViraCalendar — executar no SQL Editor de um projeto Supabase dedicado.
-- A chave publishable/anon fica no navegador; NUNCA inserir a service_role no site.
create table if not exists public.viracalendar_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 160),
  scheduled_date date not null,
  status text not null default 'planned' check (status in ('planned','posted')),
  notes text not null default '',
  file_path text not null unique,
  original_filename text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint path_belongs_to_owner check (split_part(file_path,'/',1) = user_id::text)
);
create index if not exists viracalendar_videos_owner_date_idx
  on public.viracalendar_videos (user_id,scheduled_date);
alter table public.viracalendar_videos enable row level security;
grant select,insert,update,delete on public.viracalendar_videos to authenticated;

drop policy if exists viracalendar_select_own on public.viracalendar_videos;
create policy viracalendar_select_own on public.viracalendar_videos
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists viracalendar_insert_own on public.viracalendar_videos;
create policy viracalendar_insert_own on public.viracalendar_videos
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists viracalendar_update_own on public.viracalendar_videos;
create policy viracalendar_update_own on public.viracalendar_videos
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists viracalendar_delete_own on public.viracalendar_videos;
create policy viracalendar_delete_own on public.viracalendar_videos
  for delete to authenticated using (user_id = (select auth.uid()));

insert into storage.buckets (id,name,public,file_size_limit)
values ('viracalendar-videos','viracalendar-videos',false,52428800)
on conflict (id) do nothing;

drop policy if exists viracalendar_storage_read on storage.objects;
create policy viracalendar_storage_read on storage.objects
  for select to authenticated using (
    bucket_id = 'viracalendar-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists viracalendar_storage_upload on storage.objects;
create policy viracalendar_storage_upload on storage.objects
  for insert to authenticated with check (
    bucket_id = 'viracalendar-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists viracalendar_storage_delete on storage.objects;
create policy viracalendar_storage_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'viracalendar-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
