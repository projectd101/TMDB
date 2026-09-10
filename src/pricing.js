// Pandora Apple pricing rules
// Flat, time-based pricing: you pay for a fixed duration your campaign is
// live on the billboard, not for a number of clicks/interactions. Keep
// these numbers in sync with create_checkout_campaign() in Supabase — that
// function is the actual source of truth; this file is for instant UI
// feedback only (showing a price before checkout is opened).

export const DURATION_TIERS = [
  { hours: 24, label: "24 hours", priceCents: 900 },
  { hours: 72, label: "3 days", priceCents: 2500 },
  { hours: 168, label: "7 days", priceCents: 5000 },
];

export function priceForDuration(hours) {
  const tier = DURATION_TIERS.find((t) => t.hours === hours);
  return tier ? tier.priceCents : null;
}

export function formatCents(cents) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
