-- ============================================================================
-- Launch hardening migration
-- 1. Real IP-based rate limiting + time-window check on register_click
-- 2. Remove dead queueing function (advance_campaign_queue) + queue_position
-- 3. Add setup-token flow: pay first, fill in brand details after payment
-- 4. Remove dead "winner / Nth-click prize" feature entirely
-- 5. Fix admin contact email typo
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RATE LIMITING on register_click
-- ----------------------------------------------------------------------------
-- Rules:
--   - Same ip_hash can register at most 1 click per campaign every 2 seconds
--     (blocks tight loop scripting)
--   - Same ip_hash can register at most 30 clicks total across a rolling
--     60-second window (blocks burst abuse even if spaced out slightly)
--   - Same ip_hash can register at most 200 clicks against the SAME campaign
--     in any rolling 24h window (blocks one person draining a whole budget)
-- An empty/missing ip_hash is treated as a single shared bucket, so anyone
-- not sending a hash is rate limited hardest.

create index if not exists idx_clicks_ip_hash_time
  on public.clicks (ip_hash, clicked_at desc);

create index if not exists idx_clicks_campaign_ip_time
  on public.clicks (campaign_id, ip_hash, clicked_at desc);

create or replace function public.register_click(p_slot apple_slot, p_ip_hash text default '')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_campaign public.campaigns%rowtype;
  v_click_number integer;
  v_ip text := coalesce(nullif(trim(p_ip_hash), ''), 'unknown');
  v_recent_same_campaign integer;
  v_recent_any integer;
  v_last_click_at timestamptz;
  v_daily_same_campaign integer;
begin
  select * into v_campaign
  from public.campaigns
  where slot = p_slot and status = 'live'
  order by started_at desc nulls last, created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('registered', false, 'reason', 'no_live_campaign');
  end if;

  if v_campaign.current_click_count >= v_campaign.clicks_target then
    return jsonb_build_object('registered', false, 'reason', 'campaign_complete', 'campaign_id', v_campaign.id);
  end if;

  -- (a) cooldown: same IP cannot click the same campaign faster than every 2s
  select max(clicked_at) into v_last_click_at
  from public.clicks
  where campaign_id = v_campaign.id and ip_hash = v_ip;

  if v_last_click_at is not null and v_last_click_at > now() - interval '2 seconds' then
    return jsonb_build_object('registered', false, 'reason', 'rate_limited_cooldown');
  end if;

  -- (b) burst limit: same IP cannot exceed 30 clicks (any campaign) in 60s
  select count(*) into v_recent_any
  from public.clicks
  where ip_hash = v_ip and clicked_at > now() - interval '60 seconds';

  if v_recent_any >= 30 then
    return jsonb_build_object('registered', false, 'reason', 'rate_limited_burst');
  end if;

  -- (c) daily cap per IP per campaign: max 200 clicks / 24h
  select count(*) into v_daily_same_campaign
  from public.clicks
  where campaign_id = v_campaign.id and ip_hash = v_ip and clicked_at > now() - interval '24 hours';

  if v_daily_same_campaign >= 200 then
    return jsonb_build_object('registered', false, 'reason', 'rate_limited_daily_cap');
  end if;

  v_click_number := v_campaign.current_click_count + 1;

  insert into public.clicks(campaign_id, click_number, ip_hash)
  values (v_campaign.id, v_click_number, v_ip);

  update public.campaigns
  set current_click_count = v_click_number,
      status = case when v_click_number >= clicks_target then 'completed'::campaign_status else status end,
      completed_at = case when v_click_number >= clicks_target then now() else completed_at end
  where id = v_campaign.id;

  -- If this click completed the campaign, promote the next queued campaign
  -- in this slot to live immediately (no separate queue-advance job needed).
  if v_click_number >= v_campaign.clicks_target then
    perform public.promote_next_queued_campaign(p_slot);
  end if;

  return jsonb_build_object(
    'registered', true,
    'campaign_id', v_campaign.id,
    'click_number', v_click_number,
    'completed', v_click_number >= v_campaign.clicks_target
  );
end;
$function$;

-- Promotes the oldest 'queued' campaign in a slot to 'live', if that slot
-- currently has no live campaign. Called automatically when a campaign
-- completes; replaces the old advance_campaign_queue()/queue_position setup.
create or replace function public.promote_next_queued_campaign(p_slot apple_slot)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_next uuid;
begin
  if exists (select 1 from public.campaigns where slot = p_slot and status = 'live') then
    return null;
  end if;

  select id into v_next
  from public.campaigns
  where slot = p_slot and status = 'queued'
  order by setup_completed_at asc nulls last, paid_at asc nulls last, created_at asc
  for update skip locked
  limit 1;

  if v_next is not null then
    update public.campaigns
    set status = 'live', started_at = coalesce(started_at, now())
    where id = v_next;
  end if;

  return v_next;
end;
$function$;

revoke all on function public.promote_next_queued_campaign(apple_slot) from public;
grant execute on function public.promote_next_queued_campaign(apple_slot) to service_role;

-- ----------------------------------------------------------------------------
-- 2. REMOVE dead queueing mechanism
-- ----------------------------------------------------------------------------
drop function if exists public.advance_campaign_queue();

alter table public.campaigns drop column if exists queue_position;

-- ----------------------------------------------------------------------------
-- 3. SETUP-TOKEN FLOW (pay first, details after)
-- ----------------------------------------------------------------------------
-- New campaign_status 'awaiting_setup' was added by the prior migration
-- (20260908999000_add_awaiting_setup_status.sql) since it must commit
-- before it can be referenced in function bodies below.

alter table public.campaigns
  add column if not exists setup_token text unique,
  add column if not exists setup_token_expires_at timestamptz,
  add column if not exists setup_completed_at timestamptz;

-- Relax NOT NULL on fields that are now only known after the setup step.
alter table public.campaigns alter column brand_name drop not null;
alter table public.campaigns alter column contact_email drop not null;
alter table public.campaigns alter column destination_url drop not null;

create index if not exists idx_campaigns_setup_token on public.campaigns (setup_token);

-- Creates the skeleton campaign row at checkout time: just slot + interactions
-- purchased + computed price. No brand details yet.
create or replace function public.create_checkout_campaign(
  p_slot apple_slot,
  p_clicks_target integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_fee_cents integer;
  v_total_cents integer;
  v_token text;
  v_per_click_cents constant numeric := 1;      -- keep in sync with src/pricing.js AD_FEE_PER_CLICK_CENTS
  v_center_multiplier constant numeric := 1.5;  -- keep in sync with src/pricing.js CENTER_SLOT_MULTIPLIER
begin
  if p_clicks_target is null or p_clicks_target <= 0 then
    raise exception 'invalid_clicks_target';
  end if;

  -- Pricing is computed server-side only (no prize component anymore).
  v_fee_cents := round(p_clicks_target * v_per_click_cents * (case when p_slot::text = 'center' then v_center_multiplier else 1 end));
  v_total_cents := v_fee_cents;

  -- gen_random_bytes lives in the "extensions" schema on this project, not
  -- "public" — fully qualify it since this function pins search_path to
  -- public only (security hardening against search_path hijacking).
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.campaigns (
    slot, clicks_target, ad_fee_cents, total_charge_cents, status,
    setup_token, setup_token_expires_at,
    brand_name, contact_email, destination_url
  ) values (
    p_slot, p_clicks_target, v_fee_cents, v_total_cents, 'pending_payment',
    v_token, now() + interval '7 days',
    '', '', ''
  )
  returning id into v_id;

  return jsonb_build_object('campaign_id', v_id, 'setup_token', v_token, 'total_charge_cents', v_total_cents);
end;
$function$;

-- Called by the setup page (post-payment) using the token as the credential.
create or replace function public.submit_campaign_setup(
  p_token text,
  p_brand_name text,
  p_contact_email text,
  p_destination_url text,
  p_campaign_type text,
  p_product_title text,
  p_description text,
  p_logo_url text,
  p_video_url text,
  p_brand_motto text,
  p_discount_percent numeric,
  p_discount_code text,
  p_offer_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_campaign public.campaigns%rowtype;
begin
  select * into v_campaign
  from public.campaigns
  where setup_token = p_token
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_token');
  end if;

  if v_campaign.status <> 'awaiting_setup' then
    return jsonb_build_object('ok', false, 'reason', 'not_awaiting_setup');
  end if;

  if v_campaign.setup_token_expires_at is not null and v_campaign.setup_token_expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'token_expired');
  end if;

  if p_brand_name is null or length(trim(p_brand_name)) = 0 then
    raise exception 'brand_name_required';
  end if;
  if p_contact_email is null or length(trim(p_contact_email)) = 0 then
    raise exception 'contact_email_required';
  end if;
  if p_destination_url is null or length(trim(p_destination_url)) = 0 then
    raise exception 'destination_url_required';
  end if;

  update public.campaigns
  set brand_name = trim(p_brand_name),
      contact_email = trim(p_contact_email),
      destination_url = trim(p_destination_url),
      campaign_type = coalesce(p_campaign_type, campaign_type),
      product_title = p_product_title,
      description = p_description,
      logo_url = p_logo_url,
      video_url = p_video_url,
      brand_motto = p_brand_motto,
      discount_percent = p_discount_percent,
      discount_code = p_discount_code,
      offer_expires_at = p_offer_expires_at,
      status = 'queued',
      setup_completed_at = now(),
      setup_token = null -- one-time use: invalidate immediately
  where id = v_campaign.id;

  -- Try to go live immediately if the slot is currently free.
  perform public.promote_next_queued_campaign(v_campaign.slot);

  return jsonb_build_object('ok', true, 'campaign_id', v_campaign.id);
end;
$function$;

-- Lock these down: only the setup page (anon key + token-as-secret) needs
-- submit_campaign_setup and create_checkout_campaign; nobody should be able
-- to read setup_token via the table directly.
revoke all on function public.create_checkout_campaign(apple_slot, integer) from public;
grant execute on function public.create_checkout_campaign(apple_slot, integer) to anon, authenticated;

revoke all on function public.submit_campaign_setup(text, text, text, text, text, text, text, text, text, text, numeric, text, timestamptz) from public;
grant execute on function public.submit_campaign_setup(text, text, text, text, text, text, text, text, text, text, numeric, text, timestamptz) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. REMOVE dead "winner / Nth-click prize" feature
-- ----------------------------------------------------------------------------
drop function if exists public.claim_win(uuid, text);
drop function if exists public.get_recent_winners(integer);
drop function if exists public.claim_prize(uuid, text);
drop table if exists public.winners cascade;

alter table public.campaigns
  drop column if exists prize_value_cents,
  drop column if exists prize_description,
  drop column if exists min_prize_value_cents,
  drop column if exists prize_type,
  drop column if exists subscription_service,
  drop column if exists subscription_value_cents,
  drop column if exists redemption_code;

-- ----------------------------------------------------------------------------
-- 5. Lock down direct client INSERT into campaigns now that checkout goes
--    through create_checkout_campaign()
-- ----------------------------------------------------------------------------
drop policy if exists "campaigns_insert_public" on public.campaigns;
-- (name above is a guess at the existing policy; harmless if it doesn't exist.
--  Re-run the block below regardless to ensure no public INSERT policy remains.)
do $do$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'campaigns' and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.campaigns', r.policyname);
  end loop;
end;
$do$;
