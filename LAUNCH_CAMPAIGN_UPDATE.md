# Pandora launch campaign update

The advertiser form has been rebuilt around launch/discovery campaigns:
- New Launch, Coming Soon, Anticipated, Trending, Exclusive Deal, Try It
- Product/launch title and description
- Logo + campaign video upload
- Destination/waitlist link
- Optional percentage discount, code and expiry
- Interaction inventory pricing (no Nth-click prize)
- No advertiser-facing Apple slot selector

Before running the new form against Supabase, apply:
supabase/migrations/20260908000000_launch_campaign_fields.sql

The migration adds the new campaign fields and the public campaign-videos storage bucket.
