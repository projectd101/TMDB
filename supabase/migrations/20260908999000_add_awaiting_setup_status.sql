-- New campaign_status value must be added in its own transaction/migration
-- because Postgres does not allow a new enum label to be used in the same
-- transaction that creates it.
alter type campaign_status add value if not exists 'awaiting_setup' after 'pending_payment';
