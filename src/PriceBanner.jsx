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
    <>
      <style>{`
        @keyframes stickyShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <button type="button" onClick={onAdvertiseClick} style={styles.wrap}>
        <span style={styles.row}>
          <span style={{ ...styles.sticky, ...styles.stickyOne }}>
            <span style={styles.pin} />
            <span style={styles.label}>Current price</span>
            <span style={styles.price}>{formatCents(status.current_price_cents)}</span>
          </span>
          <span style={{ ...styles.sticky, ...styles.stickyTwo }}>
            <span style={styles.pin} />
            <span style={styles.label}>Min. bid to outbid</span>
            <span style={styles.price}>{formatCents(status.min_next_bid_cents)}</span>
          </span>
        </span>
        {status.champion_brand_name && (
          <span style={styles.champion}>held by {status.champion_brand_name}</span>
        )}
      </button>
    </>
  );
}

const styles = {
  wrap: {
    position: "fixed",
    left: 40,
    top: 90,
    zIndex: 6,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
  },
  sticky: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    minWidth: 118,
    padding: "14px 16px 16px",
    borderRadius: 3,
    fontFamily: "Arial,sans-serif",
    color: "#3a2c00",
    backgroundImage:
      "linear-gradient(120deg, #ffe98a 0%, #ffd94a 30%, #f7c948 45%, #ffe98a 60%, #ffd94a 100%)",
    backgroundSize: "260% 100%",
    animation: "stickyShimmer 5s linear infinite",
    boxShadow: "0 10px 22px rgba(0,0,0,.45), 0 2px 0 rgba(255,255,255,.25) inset",
  },
  stickyOne: { transform: "rotate(-4deg)" },
  stickyTwo: { transform: "rotate(3deg)", marginTop: 10 },
  pin: {
    position: "absolute",
    top: -6,
    left: "50%",
    transform: "translateX(-50%)",
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "radial-gradient(circle at 35% 30%, #ff8a8a, #c62828)",
    boxShadow: "0 2px 3px rgba(0,0,0,.4)",
  },
  label: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em", opacity: .72 },
  price: { fontSize: 17, fontWeight: 800 },
  champion: {
    marginTop: 6,
    fontSize: 10,
    color: "rgba(255,255,255,.6)",
  },
};