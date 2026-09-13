import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Permanent hall of everyone who has ever held the billboard and been
// outbid. Logo + link only, ordered by how much they paid (highest first).
// Grows forever — nothing here ever gets removed.
export default function OutbidWall() {
  const [wall, setWall] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase.rpc("get_outbid_wall");
      if (!cancelled && !error && data) setWall(data);
    }

    load();

    const channel = supabase
      .channel("outbid-wall")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (wall.length === 0) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.eyebrow}>Hall</div>
      <div style={styles.grid}>
        {wall.map((entry) => (
          <a
            key={entry.id}
            href={entry.destination_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.tile}
            title={entry.brand_name || undefined}
          >
            <img src={entry.logo_url} alt={entry.brand_name || "Advertiser"} style={styles.logo} />
          </a>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: "fixed",
    right: 0,
    top: 96,
    bottom: 0,
    width: 96,
    overflowY: "auto",
    padding: "16px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    zIndex: 5,
    background: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,.35))",
  },
  eyebrow: {
    fontSize: 8.5,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,.4)",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "Arial,sans-serif",
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
  },
  tile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: 10,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.1)",
    alignSelf: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    padding: 6,
    boxSizing: "border-box",
  },
};
