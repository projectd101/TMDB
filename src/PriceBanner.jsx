import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { formatCents } from "./pricing";

// Publicly visible current price-to-outbid, live-updating whenever the
// champion changes (outbid or first claim).
export default function PriceBanner({ onAdvertiseClick }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase.rpc("get_current_bid_status").single();
      if (!cancelled && !error && data) setStatus(data);
    }

    load();

    const channel = supabase
      .channel("price-banner")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (!status) return null;

  return (
    <button type="button" onClick={onAdvertiseClick} style={styles.banner}>
      <span style={styles.group}>
        <span style={styles.label}>Current price</span>
        <span style={styles.price}>{formatCents(status.current_price_cents)}</span>
      </span>
      <span style={styles.divider} />
      <span style={styles.group}>
        <span style={styles.label}>Min. bid to outbid</span>
        <span style={styles.price}>{formatCents(status.min_next_bid_cents)}</span>
      </span>
      {status.champion_brand_name && (
        <span style={styles.champion}>held by {status.champion_brand_name}</span>
      )}
    </button>
  );
}

const styles = {
  banner: {
    position: "fixed",
    left: "50%",
    top: 230,
    transform: "translateX(-50%)",
    zIndex: 6,
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(0,0,0,.55)",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 999,
    padding: "8px 18px",
    color: "#fff",
    fontFamily: "Arial,sans-serif",
    cursor: "pointer",
  },
  group: { display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2 },
  divider: { width: 1, height: 22, background: "rgba(255,255,255,.18)" },
  label: { fontSize: 9, opacity: .6, textTransform: "uppercase", letterSpacing: ".04em" },
  price: { fontSize: 13, fontWeight: 800 },
  champion: { fontSize: 9, opacity: .55 },
};