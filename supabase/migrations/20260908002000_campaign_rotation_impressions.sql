-- Let the rotation endpoint atomically mark a campaign when its ad is actually played.
create or replace function public.get_next_campaign(
  p_current_campaign_id uuid default null,
  p_mark_impression boolean default false
)
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

  if p_mark_impression then
    update public.campaigns
    set impression_count = coalesce(impression_count, 0) + 1,
        last_impression_at = now()
    where id = next_id
    returning * into result;
  else
    select * into result from public.campaigns where id = next_id;
  end if;

  return result;
end;
$$;

grant execute on function public.get_next_campaign(uuid, boolean) to anon, authenticated;
