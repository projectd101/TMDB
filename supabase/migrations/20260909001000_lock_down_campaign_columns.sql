-- Public SELECT on campaigns was previously table-wide (qual: true), which
-- meant every column was readable by anon/authenticated — including
-- contact_email, paddle_transaction_id, ad_fee_cents/total_charge_cents,
-- paid_at, and the new setup_token/setup_token_expires_at/setup_completed_at
-- columns added for the pay-first flow.
--
-- RLS is row-level only; Postgres column privileges are the correct
-- mechanism to restrict which columns a role can read on rows it's
-- otherwise allowed to see. A table-wide GRANT SELECT implicitly covers
-- every column and cannot be narrowed by a later column-specific REVOKE, so
-- we revoke the table-wide grant and re-grant SELECT only on the columns
-- that are safe for public/billboard consumption.

revoke select on public.campaigns from anon, authenticated;

grant select (
  id, brand_name, brand_motto, logo_url, destination_url,
  clicks_target, current_click_count, slot, status,
  campaign_type, product_title, description, launch_date,
  discount_percent, discount_code, offer_expires_at, video_url,
  created_at, started_at, completed_at,
  impression_count, last_impression_at
) on public.campaigns to anon, authenticated;

-- Explicitly NOT granted to anon/authenticated (service_role only via
-- edge functions / security definer RPCs):
--   contact_email, paddle_transaction_id, paddle_checkout_id, ad_fee_cents,
--   total_charge_cents, paid_at, setup_token, setup_token_expires_at,
--   setup_completed_at
