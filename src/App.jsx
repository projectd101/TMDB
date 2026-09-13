import React, { useEffect, useState } from "react";
import "./force-black.css";
import DigitalBillboard from "./DigitalBillboard.jsx";
import OutbidWall from "./OutbidWall.jsx";
import PriceBanner from "./PriceBanner.jsx";
import AdvertiserForm from "./AdvertiserForm.jsx";
import CampaignSetup from "./CampaignSetup.jsx";
import {
  AboutPage,
  PrizesPage,
  TermsPage,
  PricingsPage,
  PrivacyPage,
  RefundPage,
} from "./LegalPages.jsx";
import { supabase } from "./supabaseClient.js";

function useAdvertiserFormEvents(setShowForm) {
  useEffect(() => {
    const handler = () => setShowForm(true);
    window.addEventListener("pandora:open-advertiser-form", handler);
    return () =>
      window.removeEventListener("pandora:open-advertiser-form", handler);
  }, [setShowForm]);
}

function useOnlineVisitors() {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel("million-dollar-billboard-online", {
      config: {
        presence: {
          key:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
        },
      },
    });

    const updateCount = () => {
      const state = channel.presenceState();

      const count = Object.values(state).reduce((total, entries) => {
        return total + entries.length;
      }, 0);

      setOnlineCount(count);
    };

    channel
      .on("presence", { event: "sync" }, updateCount)
      .on("presence", { event: "join" }, updateCount)
      .on("presence", { event: "leave" }, updateCount)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            online_at: new Date().toISOString(),
          });

          updateCount();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineCount;
}

/*
 * Formats large viewer numbers elegantly:
 *
 * 999     → 999
 * 1,200   → 1.2K
 * 12,400  → 12.4K
 * 125,000 → 125K
 * 1.2M    → 1.2M
 */
function formatViewerCount(value) {
  if (!Number.isFinite(value) || value < 0) return "0";

  if (value >= 1000000) {
    const millions = value / 1000000;
    return `${millions >= 10 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }

  if (value >= 1000) {
    const thousands = value / 1000;
    return `${thousands >= 100 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }

  return Math.floor(value).toLocaleString();
}

/*
 * Global website-view counter.
 *
 * This expects a Supabase RPC called:
 *
 *   register_page_view
 *
 * returning the current total as:
 *
 *   { view_count: number }
 */
function useWebsiteViewCount() {
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const registerView = async () => {
      try {
        const { data, error } = await supabase.rpc("register_page_view");

        if (error) {
          console.error("Could not register website view:", error);
          return;
        }

        const result = Array.isArray(data) ? data[0] : data;

        if (!cancelled && result?.view_count != null) {
          setViewCount(Number(result.view_count));
        }
      } catch (error) {
        console.error("Website view counter error:", error);
      }
    };

    registerView();

    return () => {
      cancelled = true;
    };
  }, []);

  return viewCount;
}

const navItems = [
  ["about", "About"],
  ["prizes", "Discover"],
  ["terms", "Terms"],
  ["pricing", "Pricing"],
];

// Paths Dodo Payments (and anyone else) can hit directly, e.g.
// themilliondollarbillboard.vercel.app/terms — these must resolve to real
// content without any button clicks, since verification bots and shared
// links land here cold.
const PAGE_PATHS = {
  terms: "/terms",
  pricing: "/pricing",
  about: "/about",
  prizes: "/discover",
  privacy: "/privacy",
  refunds: "/refunds",
};

function pageFromPath(pathname) {
  const entry = Object.entries(PAGE_PATHS).find(([, path]) => path === pathname);
  return entry ? entry[0] : "home";
}

function useSetupToken() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === "/setup" && params.get("token")) {
      setToken(params.get("token"));
    }
  }, []);

  return token;
}

export default function App() {
  const [showForm, setShowForm] = useState(() => {
    // Dodo's return_url lands on "/?checkout=complete&payment_id=...".
    // AdvertiserForm is what resolves that param into a setup redirect, so
    // it must be mounted immediately rather than showing the plain
    // homepage first.
    return new URLSearchParams(window.location.search).get("checkout") === "complete";
  });
  const [page, setPage] = useState(() => pageFromPath(window.location.pathname));
  const [activeCampaign, setActiveCampaign] = useState(null);

  const onlineCount = useOnlineVisitors();
  const viewCount = useWebsiteViewCount();
  const setupToken = useSetupToken();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtml = html.style.backgroundColor;
    const prevBody = body.style.backgroundColor;

    html.style.backgroundColor = "#000";
    body.style.backgroundColor = "#000";

    return () => {
      html.style.backgroundColor = prevHtml;
      body.style.backgroundColor = prevBody;
    };
  }, []);

  // Keep the address bar in sync with the visible page, and support
  // browser back/forward between them.
  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useAdvertiserFormEvents(setShowForm);

  // Post-payment setup link: /setup?token=xxxx — a dedicated flow that
  // bypasses the normal billboard/nav chrome entirely. This check must come
  // AFTER every hook above has been called (React requires hooks to run in
  // the same order on every render — an early return before a hook call
  // breaks that and silently corrupts state, which is what caused the blank
  // black screen here).
  if (setupToken) {
    return <CampaignSetup token={setupToken} />;
  }

  const goHome = () => {
    setPage("home");
    setShowForm(false);
    window.history.pushState({}, "", "/");
  };

  const openPage = (nextPage) => {
    setShowForm(false);
    setPage(nextPage);
    window.history.pushState({}, "", PAGE_PATHS[nextPage] || "/");
  };

  const handleAdvertise = () => {
    setPage("home");
    setShowForm((value) => !value);
  };

  return (
    <div style={styles.page}>
      <header style={styles.topBar}>
        <button
          type="button"
          style={styles.logoButton}
          onClick={goHome}
          aria-label="Go to home"
        >
          <img
            src="/logo.png"
            alt="The Million Dollar Billboard"
            style={styles.logoImg}
          />
        </button>

        <nav style={styles.nav} aria-label="Main navigation">
          {navItems.map(([key, label]) => (
            <NavLink
              key={key}
              active={page === key}
              onClick={() => openPage(key)}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.headerRight}>
          {activeCampaign && (
            <div
              style={styles.campaignClickStatus}
              aria-label={`${activeCampaign.brand_name || "Live campaign"} has ${Number(activeCampaign.current_click_count || 0).toLocaleString()} clicks`}
            >
              {activeCampaign.logo_url && (
                <img
                  src={activeCampaign.logo_url}
                  alt=""
                  style={styles.campaignLogo}
                />
              )}
              <span style={styles.campaignClicks}>
                {Number(activeCampaign.current_click_count || 0).toLocaleString()} clicks
              </span>
            </div>
          )}

          <div
            style={styles.onlineStatus}
            aria-label={`${onlineCount} people currently online`}
          >
            <span style={styles.onlineDot} />

            <span style={styles.onlineNumber}>
              {onlineCount > 0 ? onlineCount : "—"}
            </span>

            <span style={styles.onlineLabel}>online</span>
          </div>

          <button
            type="button"
            style={{
              ...styles.advertiserBtn,
              ...(showForm ? styles.advertiserBtnOpen : {}),
            }}
            onClick={handleAdvertise}
          >
            <span style={styles.advertiserDot} />

            <span>
              {showForm ? "View billboard" : "Advertise"}
            </span>

            <span style={styles.advertiserArrow}>
              {showForm ? "↗" : "→"}
            </span>
          </button>
        </div>
      </header>

      {page !== "home" ? (
        <main style={styles.infoMain}>
          {page === "about" && <AboutPage onBack={goHome} />}
          {page === "prizes" && <PrizesPage onBack={goHome} />}
          {page === "terms" && <TermsPage onBack={goHome} />}
          {page === "pricing" && <PricingsPage onBack={goHome} />}
          {page === "privacy" && <PrivacyPage onBack={goHome} />}
          {page === "refunds" && <RefundPage onBack={goHome} />}
        </main>
      ) : showForm ? (
        <main style={styles.formMain}>
          <AdvertiserForm onDone={() => setShowForm(false)} />
        </main>
      ) : (
        <main style={styles.billboardMain}>
          <DigitalBillboard onCampaignChange={setActiveCampaign} />
          <PriceBanner onAdvertiseClick={() => setShowForm(true)} />
          <OutbidWall />

          <section style={styles.discoveryCopy}>
            <div style={styles.discoveryEyebrow}>
              THE MILLION DOLLAR BILLBOARD
            </div>

            <h1 style={styles.discoveryTitle}>
              Discover what’s next.
            </h1>

            <p style={styles.discoveryText}>
              Explore daily launches, trending products, and anticipated
              releases — while unlocking exclusive offers and special
              discounts from our partners that you won’t find anywhere else.
            </p>
          </section>
        </main>
      )}

      <div
        style={styles.viewerCounter}
        aria-label={`${viewCount.toLocaleString()} website views`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle
            cx="12"
            cy="12"
            r="2.8"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>

        <span style={styles.viewerNumber}>
          {formatViewerCount(viewCount)}
        </span>
      </div>
    </div>
  );
}

function NavLink({ children, active, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.navLink,
        ...(hovered ? styles.navLinkHover : {}),
        ...(active ? styles.navLinkActive : {}),
      }}
    >
      <span>{children}</span>

      <span
        style={{
          ...styles.navIndicator,
          width: active ? 16 : hovered ? 10 : 0,
          opacity: active || hovered ? 1 : 0,
        }}
      />
    </button>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    overflowX: "hidden",
  },

  topBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    padding: "7px 30px 0",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "start",
    boxSizing: "border-box",
    zIndex: 80,
    pointerEvents: "none",
    background: "#000",
    borderBottom: "1px solid rgba(255,255,255,.06)",
  },

  logoButton: {
    justifySelf: "start",
    border: 0,
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    pointerEvents: "auto",
    transform: "translateY(-12px)",
  },

  logoImg: {
    display: "block",
    width: 150,
    height: 150,
    objectFit: "contain",
    objectPosition: "left top",
    filter: "drop-shadow(0 8px 20px rgba(0,0,0,.45))",
  },

  nav: {
    marginTop: 3,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 7,
    padding: "5px 8px",
    border: "1px solid rgba(255,255,255,.07)",
    background: "rgba(10,10,10,.52)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderRadius: 999,
    boxShadow:
      "0 10px 35px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.035)",
    pointerEvents: "auto",
  },

  navLink: {
    position: "relative",
    border: 0,
    background: "transparent",
    color: "rgba(255,255,255,.66)",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 650,
    letterSpacing: "-.01em",
    cursor: "pointer",
    padding: "8px 13px 10px",
    borderRadius: 999,
    transition:
      "color .18s ease, background .18s ease, transform .18s ease",
  },

  navLinkHover: {
    color: "#fff",
    background: "rgba(255,255,255,.065)",
    transform: "translateY(-1px)",
  },

  navLinkActive: {
    color: "#fff",
  },

  navIndicator: {
    position: "absolute",
    left: "50%",
    bottom: 5,
    height: 2,
    transform: "translateX(-50%)",
    borderRadius: 99,
    background: "#fff",
    transition: "width .18s ease, opacity .18s ease",
  },

  headerRight: {
    justifySelf: "end",
    display: "flex",
    alignItems: "center",
    gap: 17,
    marginTop: 3,
    pointerEvents: "auto",
  },

  campaignClickStatus: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    whiteSpace: "nowrap",
    color: "rgba(255,255,255,.58)",
    fontSize: 11,
    fontWeight: 550,
    letterSpacing: "-.01em",
  },

  campaignLogo: {
    width: 24,
    height: 24,
    objectFit: "contain",
    borderRadius: 5,
    display: "block",
  },

  campaignClicks: {
    color: "rgba(255,255,255,.62)",
    fontWeight: 600,
  },

  onlineStatus: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
    color: "rgba(255,255,255,.46)",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "-.01em",
  },

  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#35d06f",
    boxShadow:
      "0 0 0 3px rgba(53,208,111,.08), 0 0 10px rgba(53,208,111,.55)",
    flex: "0 0 auto",
  },

  onlineNumber: {
    color: "rgba(255,255,255,.78)",
    fontWeight: 650,
    minWidth: 8,
    textAlign: "right",
  },

  onlineLabel: {
    color: "rgba(255,255,255,.4)",
    fontWeight: 450,
  },

  advertiserBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    border: "1px solid rgba(255,255,255,.13)",
    background: "rgba(255,255,255,.94)",
    color: "#0a0a0a",
    borderRadius: 999,
    padding: "10px 13px 10px 11px",
    minWidth: 132,
    justifyContent: "center",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 750,
    letterSpacing: "-.01em",
    cursor: "pointer",
    boxShadow:
      "0 8px 28px rgba(0,0,0,.30), 0 0 0 1px rgba(255,255,255,.04) inset",
    transition:
      "transform .18s ease, box-shadow .18s ease, background .18s ease",
  },

  advertiserBtnOpen: {
    background: "rgba(255,255,255,.84)",
  },

  advertiserDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#ff2d2d",
    boxShadow: "0 0 12px rgba(255,45,45,.65)",
    flex: "0 0 auto",
  },

  advertiserArrow: {
    fontSize: 16,
    lineHeight: 1,
    marginTop: -1,
    opacity: 0.72,
  },

  billboardMain: {
    minHeight: "100vh",
    position: "relative",
    background: "#000",
  },

  discoveryCopy: {
    position: "absolute",
    left: "clamp(10px, 2vw, 34px)",
    top: "50%",
    transform: "translateY(-43%)",
    width: "clamp(205px, 16vw, 285px)",
    zIndex: 5,
    pointerEvents: "none",
  },

  discoveryEyebrow: {
    marginBottom: 15,
    color: "rgba(255,255,255,.28)",
    fontSize: 9,
    fontWeight: 450,
    letterSpacing: ".22em",
    lineHeight: 1.4,
    textTransform: "uppercase",
  },

  discoveryTitle: {
    margin: 0,
    color: "rgba(255,255,255,.92)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "clamp(24px, 2vw, 34px)",
    lineHeight: 1.1,
    fontWeight: 300,
    letterSpacing: "-.045em",
  },

  discoveryText: {
    margin: "17px 0 0",
    color: "rgba(255,255,255,.4)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 12.5,
    lineHeight: 1.72,
    fontWeight: 350,
    letterSpacing: "-.008em",
  },

  /*
   * Small website viewer counter.
   * Fixed to the bottom-right so it never affects
   * the billboard's layout.
   */
  viewerCounter: {
    position: "fixed",
    right: 22,
    bottom: 18,
    zIndex: 90,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "rgba(255,255,255,.38)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "-.01em",
    pointerEvents: "none",
    userSelect: "none",
  },

  viewerNumber: {
    color: "rgba(255,255,255,.52)",
    fontWeight: 550,
  },

  formMain: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "90px 20px 50px",
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 50% 20%, #191919 0%, #000 68%)",
  },

  infoMain: {
    position: "relative",
    minHeight: "100vh",
    paddingTop: 70,
    boxSizing: "border-box",
    backgroundColor: "#000",
    color: "#fff",
    isolation: "isolate",
    overflow: "hidden",
  },
};