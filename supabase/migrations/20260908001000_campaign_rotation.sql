-- Campaign rotation support: track the last time a live campaign was shown.
alter table public.campaigns
  add column if not exists impression_count bigint not null default 0,
  add column if not exists last_impression_at timestamptz;

create index if not exists campaigns_rotation_idx
  on public.campaigns (status, last_impression_at, started_at, created_at);

create or replace function public.get_next_campaign(p_current_campaign_id uuid default null)
returns public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id uuid;
  result public.campaigns;
begin
  select c.id into next_id
  from public.campaigns c
  where c.status = 'live'
    and c.slot::text = 'left'
    and c.video_url is not null
    and length(trim(c.video_url)) > 0
    and (c.offer_expires_at is null or c.offer_expires_at > now())
    and (c.clicks_target <= 0 or c.current_click_count < c.clicks_target)
    and (p_current_campaign_id is null or c.id <> p_current_campaign_id)
  order by c.last_impression_at asc nulls first, c.started_at asc nulls last,
           c.created_at asc, c.id asc
  for update skip locked limit 1;

  if next_id is null and p_current_campaign_id is not null then
    select c.id into next_id
    from public.campaigns c
    where c.status = 'live'
      and c.slot::text = 'left'
      and c.video_url is not null
      and length(trim(c.video_url)) > 0
      and (c.offer_expires_at is null or c.offer_expires_at > now())
      and (c.clicks_target <= 0 or c.current_click_count < c.clicks_target)
    order by c.last_impression_at asc nulls first, c.started_at asc nulls last,
             c.created_at asc, c.id asc
    for update skip locked limit 1;
  end if;

  if next_id is null then return null; end if;
  select * into result from public.campaigns where id = next_id;
  return result;
end;
$$;

grant execute on function public.get_next_campaign(uuid) to anon, authenticated;
