-- Pandora launch/discovery campaign fields.
-- Legacy prize/slot columns remain for compatibility with the current
-- payment/webhook path; new campaigns no longer expose either concept.

alter table public.campaigns
  add column if not exists campaign_type text not null default 'new_launch',
  add column if not exists product_title text,
  add column if not exists description text,
  add column if not exists launch_date date,
  add column if not exists discount_percent integer,
  add column if not exists discount_code text,
  add column if not exists offer_expires_at timestamptz,
  add column if not exists video_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_campaign_type_check'
  ) then
    alter table public.campaigns
      add constraint campaigns_campaign_type_check
      check (campaign_type in (
        'new_launch',
        'coming_soon',
        'anticipated',
        'trending',
        'deal',
        'try_it'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_discount_percent_check'
  ) then
    alter table public.campaigns
      add constraint campaigns_discount_percent_check
      check (discount_percent is null or (discount_percent >= 1 and discount_percent <= 100));
  end if;
end $$;

-- Public CDN delivery for advertiser campaign videos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-videos',
  'campaign-videos',
  true,
  52428800,
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array['video/mp4', 'video/webm'];

drop policy if exists "campaign videos public read" on storage.objects;
create policy "campaign videos public read"
on storage.objects for select
to public
using (bucket_id = 'campaign-videos');

drop policy if exists "campaign videos anon upload" on storage.objects;
create policy "campaign videos anon upload"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'campaign-videos');
