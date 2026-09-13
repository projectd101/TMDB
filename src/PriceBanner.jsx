import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { formatCents } from "./pricing";

// Publicly visible current price-to-beat, live-updating whenever the
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
      <span style={styles.label}>Current price to beat</span>
      <span style={styles.price}>{formatCents(status.current_price_cents)}</span>
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
    top: 96,
    transform: "translateX(-50%)",
    zIndex: 6,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(0,0,0,.55)",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 999,
    padding: "8px 18px",
    color: "#fff",
    fontFamily: "Arial,sans-serif",
    cursor: "pointer",
  },
  label: { fontSize: 10.5, opacity: .6, textTransform: "uppercase", letterSpacing: ".04em" },
  price: { fontSize: 15, fontWeight: 800 },
  champion: { fontSize: 10.5, opacity: .55 },
};
