// The Million Dollar Billboard — auction pricing.
// There is exactly one spot. Whoever has paid the most currently holds it.
// To take over, you must bid at least $5 more than the current price.
// The real numbers live in Postgres (get_current_bid_status /
// create_checkout_campaign) — this file only formats what the server
// returns, it never invents a price itself.

export const MIN_BID_INCREMENT_CENTS = 500;
export const BASE_PRICE_CENTS = 500;

export function formatCents(cents) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
