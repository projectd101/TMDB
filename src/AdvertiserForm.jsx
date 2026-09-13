import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { formatCents, MIN_BID_INCREMENT_CENTS } from "./pricing";

// Auction flow — one spot, always for sale to the highest bidder:
// 1. On mount, fetch the live minimum bid (get_current_bid_status) so the
//    advertiser always sees a real, current number, never a stale one.
// 2. They enter a bid at or above that minimum. We create a lightweight
//    "skeleton" campaign row (create_checkout_campaign, re-validated
//    server-side against the live minimum) and redirect to Dodo's hosted
//    checkout for that amount.
// 3. Dodo's return_url points back at our own homepage as
//    "/?checkout=complete&payment_id=...". On mount we check for that query
//    string, call get-setup-link with payment_id to get the one-time setup
//    token, then redirect to /setup?token=... No email, no login required.
// 4. Submitting the setup form (brand/logo/video) is the moment the bid
//    actually takes over the big billboard — submit_campaign_setup demotes
//    whoever's currently live to the permanent side-rail in the same
//    transaction. There is no time limit: you hold the spot until someone
//    outbids you by at least $5.
export default function AdvertiserForm({ onDone }) {
  const [minBidCents, setMinBidCents] = useState(null);
  const [currentPriceCents, setCurrentPriceCents] = useState(null);
  const [championName, setChampionName] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [bidInput, setBidInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);
  const [pendingCampaignId, setPendingCampaignId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadBidStatus() {
      setLoadingStatus(true);
      const { data, error } = await supabase.rpc("get_current_bid_status").single();
      if (cancelled) return;
      if (!error && data) {
        setCurrentPriceCents(data.current_price_cents);
        setMinBidCents(data.min_next_bid_cents);
        setChampionName(data.champion_brand_name);
        setBidInput((data.min_next_bid_cents / 100).toString());
      }
      setLoadingStatus(false);
    }
    loadBidStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  // On mount, check whether we've just been sent back here by Dodo
  // (return_url = "/?checkout=complete&payment_id=..."). If so, skip the
  // whole form and resolve straight to the setup page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "complete") {
      const paymentId = params.get("payment_id");
      // Clean the URL so a refresh doesn't re-trigger this.
      window.history.replaceState({}, "", window.location.pathname);
      if (paymentId) {
        redirectToSetup(paymentId);
      } else {
        setFinalizeError(
          "Payment received, but we couldn't read the payment reference. Please contact support."
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function redirectToSetup(paymentId, attempt = 0) {
    setFinalizing(true);
    setFinalizeError(null);

    try {
      const { data, error } = await supabase.functions.invoke("get-setup-link", {
        body: { payment_id: paymentId },
      });

      if (error || !data) {
        throw new Error("Could not finalize your campaign.");
      }

      if (data.ready && data.setup_token) {
        window.location.href = `${window.location.origin}/setup?token=${encodeURIComponent(data.setup_token)}`;
        return;
      }

      // get-setup-link already polls for ~8s server-side. This is a slower
      // fallback on top of that, for rare cases where the webhook lags
      // even further.
      if (attempt < 3) {
        setFinalizeError(
          "Payment received — finishing setup, this can take a few seconds. Please wait…"
        );
        setTimeout(() => redirectToSetup(paymentId, attempt + 1), 4000);
      } else {
        setFinalizeError(
          "Payment received, but setup is taking longer than expected. Please refresh in a moment — your campaign is safe."
        );
      }
    } catch (err) {
      setFinalizeError(
        err.message || "Payment received, but we couldn't open your setup page automatically. Please refresh — your campaign is safe."
      );
    } finally {
      setFinalizing(false);
    }
  }

  function validate() {
    const bidCents = Math.round(parseFloat(bidInput) * 100);
    if (!Number.isFinite(bidCents) || bidCents <= 0) return "Enter a valid bid amount.";
    if (minBidCents != null && bidCents < minBidCents) {
      return `Minimum bid is ${formatCents(minBidCents)}.`;
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setCheckoutError(null);

    try {
      const bidCents = Math.round(parseFloat(bidInput) * 100);
      // Server re-validates against the live minimum and stores the real
      // amount — the client value is only used for the button copy.
      const { data, error } = await supabase.rpc("create_checkout_campaign", {
        p_amount_cents: bidCents,
      }).single();

      if (error || !data?.id) {
        throw new Error(error?.message || "Could not start your bid.");
      }

      setPendingCampaignId(data.id);
      await startCheckout(data.id);
    } catch (err) {
      setSubmitError(err.message || "Could not start your bid. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startCheckout(campaignId) {
    setCheckoutError(null);
    setCheckingOut(true);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "create-checkout",
        { body: { campaign_id: campaignId } }
      );

      if (fnError || !fnData?.checkout_url) {
        setCheckoutError("Could not start checkout. Please try again.");
        return;
      }

      // Dodo Payments has no embeddable overlay — checkout is a redirect to
      // their hosted page. Dodo sends the browser back to
      // "/?checkout=complete&payment_id=..." (return_url), which this same
      // component picks up on mount and resolves via get-setup-link.
      window.location.href = fnData.checkout_url;
    } catch {
      setCheckoutError("Could not start checkout. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  if (finalizing || finalizeError) {
    return (
      <div style={styles.successCard}>
        <div style={styles.successMark}>✓</div>
        <div style={styles.eyebrow}>Payment received</div>
        <h2 style={styles.successTitle}>
          {finalizeError ? "One more moment." : "Taking you to setup…"}
        </h2>
        <p style={styles.successText}>
          {finalizeError || "Redirecting you to finish your campaign — just a second."}
        </p>
      </div>
    );
  }

  if (pendingCampaignId) {
    return (
      <div style={styles.successCard}>
        <div style={styles.eyebrow}>Ready for checkout</div>
        <h2 style={styles.successTitle}>Almost there.</h2>
        <p style={styles.successText}>
          {checkingOut ? "Opening secure checkout…" : "Complete payment and we'll take you straight to campaign setup."}
        </p>
        {checkoutError && <p style={styles.error}>{checkoutError}</p>}
        <button
          type="button"
          style={styles.primaryButton}
          onClick={() => startCheckout(pendingCampaignId)}
          disabled={checkingOut}
        >
          {checkingOut ? "Loading…" : "Open checkout"}
        </button>
      </div>
    );
  }

  return (
    <form style={styles.shell} onSubmit={handleSubmit}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <style>{`
              @keyframes billboardRipple {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
            <span style={styles.titleRipple}>Own the billboard.</span>
          </h1>
          <p style={styles.subtitle}>
            There's only one spot. Outbid the current price by at least{" "}
            {formatCents(MIN_BID_INCREMENT_CENTS)} and it's yours — no time
            limit, you hold it until someone outbids you. The moment payment
            is confirmed, you'll add your brand, logo, and video.
          </p>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeading}>
          <div>
            <h2 style={styles.sectionTitle}>Current price to outbid</h2>
            <p style={styles.sectionHint}>
              {loadingStatus
                ? "Loading current price…"
                : championName
                ? `${championName} is currently live at ${formatCents(currentPriceCents)}.`
                : "No one has claimed the spot yet."}
            </p>
          </div>
        </div>

        <div style={styles.totalBox}>
          <style>{`
            @keyframes cardSheen {
              0% { transform: translateX(-120%) rotate(8deg); }
              100% { transform: translateX(220%) rotate(8deg); }
            }
            @keyframes priceGlow {
              0%, 100% { text-shadow: 0 0 22px rgba(91,141,255,.4), 0 0 2px rgba(233,60,255,.4); }
              50% { text-shadow: 0 0 38px rgba(233,60,255,.5), 0 0 4px rgba(91,141,255,.6); }
            }
          `}</style>
          <div style={styles.totalBoxSheen} />
          <div style={styles.totalBoxInner}>
            <div>
              <span style={styles.totalLabel}>Current price</span>
              <strong style={styles.currentPrice}>
                {loadingStatus ? "…" : formatCents(currentPriceCents)}
              </strong>
              <span style={styles.totalLabel2}>Minimum bid</span>
              <strong style={styles.totalPrice}>
                {loadingStatus ? "…" : formatCents(minBidCents)}
              </strong>
              <span style={styles.totalSub}>
                +{formatCents(MIN_BID_INCREMENT_CENTS)} over the current price
              </span>
            </div>
            <div style={styles.totalRight}>
              <label style={styles.bidLabel} htmlFor="bid-amount">
                Your bid (USD)
              </label>
              <div style={styles.bidInputWrap}>
                <span style={styles.bidInputPrefix}>$</span>
                <input
                  id="bid-amount"
                  type="number"
                  step="0.01"
                  min={minBidCents != null ? minBidCents / 100 : undefined}
                  value={bidInput}
                  onChange={(e) => setBidInput(e.target.value)}
                  style={styles.bidInput}
                  disabled={loadingStatus}
                />
              </div>
              <small style={styles.bidFinePrint}>Final amount is confirmed securely at checkout.</small>
            </div>
          </div>
        </div>
      </div>

      {submitError && <div style={styles.errorBox}>{submitError}</div>}

      <div style={styles.footer}>
        <div>
          <strong>Ready to take over?  </strong>
          <span>You'll add your brand details right after payment.</span>
        </div>
        <button type="submit" style={styles.primaryButton} disabled={submitting || loadingStatus}>
          {submitting ? "Preparing checkout…" : "Continue to payment →"}
        </button>
      </div>
    </form>
  );
}

const styles = {
  shell: {
    width: "min(760px, 100%)",
    background: "#0b0b0b",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.13)",
    borderRadius: 28,
    boxShadow: "0 40px 120px rgba(0,0,0,.72), 0 0 0 1px rgba(255,212,0,.025)",
    overflow: "hidden",
    fontFamily: '"Avenir Next", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    padding: "46px 46px 42px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 32,
    borderBottom: "1px solid rgba(255,255,255,.09)",
    background: "radial-gradient(circle at 0% 0%, rgba(227,6,19,.14), transparent 32%), radial-gradient(circle at 100% 0%, rgba(255,212,0,.09), transparent 34%), linear-gradient(135deg,#111 0%,#0b0b0b 62%)",
  },
  eyebrow: { fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "#ffd400", marginBottom: 10 },
  title: { margin: 0, maxWidth: 760, fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.02, letterSpacing: "-.055em", fontWeight: 750, fontFamily: '"Avenir Next", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  titleRipple: {
    backgroundImage: "linear-gradient(90deg, #fff 0%, #fff 38%, #5b8dff 48%, #e93cff 54%, #fff 64%, #fff 100%)",
    backgroundSize: "300% 100%",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
    animation: "billboardRipple 4s linear infinite",
    display: "inline-block",
  },
  subtitle: { margin: "15px 0 0", maxWidth: 690, color: "rgba(255,255,255,.57)", fontSize: 14, lineHeight: 1.65 },
  section: { padding: "38px 46px 42px", borderBottom: "1px solid rgba(255,255,255,.075)", background: "#0b0b0b" },
  sectionHeading: { marginBottom: 25 },
  sectionTitle: { margin: 0, fontSize: 21, lineHeight: 1.2, letterSpacing: "-.025em", fontWeight: 700 },
  sectionHint: { margin: "7px 0 0", fontSize: 12.5, color: "rgba(255,255,255,.42)", lineHeight: 1.55 },
  field: { display: "block", marginBottom: 20 },
  fieldLabel: { display: "block", marginBottom: 8, fontSize: 11, fontWeight: 650, color: "rgba(255,255,255,.62)", letterSpacing: ".005em" },
  input: {
    display: "block", width: "100%", boxSizing: "border-box", padding: "14px 15px",
    borderRadius: 11, border: "1px solid rgba(255,255,255,.14)", background: "#151515",
    color: "#fff", outline: "none", fontFamily: "inherit", fontSize: 13, lineHeight: 1.4,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.025), 0 1px 2px rgba(0,0,0,.2)",
  },
  presetGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 20 },
  bidLabel: { display: "block", fontSize: 10, opacity: .5, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 },
  bidInputWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    background: "rgba(0,0,0,.35)",
    border: "1px solid rgba(233,60,255,.35)",
    borderRadius: 12,
    padding: "6px 14px",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.02)",
  },
  bidInputPrefix: { color: "#5b8dff", fontSize: 18, fontWeight: 800 },
  bidInput: {
    width: 130, background: "transparent", border: "none", outline: "none",
    color: "#fff", fontSize: 20, fontWeight: 800, padding: "4px 4px",
    fontFamily: "inherit", letterSpacing: "-.02em",
  },
  bidFinePrint: { display: "block", marginTop: 8, opacity: .4 },
  totalBox: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    padding: "1px",
    background: "linear-gradient(135deg, #5b8dff 0%, rgba(255,255,255,.08) 30%, #e93cff 70%, rgba(255,255,255,.05) 100%)",
    boxShadow: "0 20px 60px -20px rgba(0,0,0,.7), 0 0 50px -12px rgba(91,141,255,.35), 0 0 50px -12px rgba(233,60,255,.25)",
  },
  totalBoxSheen: {
    position: "absolute",
    top: "-50%",
    left: 0,
    width: "35%",
    height: "200%",
    background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.12), rgba(255,255,255,0))",
    animation: "cardSheen 5s ease-in-out infinite",
    pointerEvents: "none",
    zIndex: 2,
  },
  totalBoxInner: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    padding: "26px 28px",
    borderRadius: 19,
    background: "linear-gradient(160deg, #14101f 0%, #0a0a12 45%, #150c1a 100%)",
    color: "#fff",
  },
  totalLabel: { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", backgroundImage: "linear-gradient(90deg, #5b8dff, #e93cff)", backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent", marginBottom: 6 },
  currentPrice: { display: "block", fontSize: 20, lineHeight: 1, letterSpacing: "-.03em", fontWeight: 700, color: "rgba(255,255,255,.75)", marginBottom: 14 },
  totalLabel2: { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,.45)", marginBottom: 6 },
  totalPrice: {
    display: "block", fontSize: 38, lineHeight: 1, letterSpacing: "-.045em",
    fontWeight: 800, color: "#fff",
    animation: "priceGlow 3.2s ease-in-out infinite",
  },
  totalSub: { display: "block", fontSize: 11, opacity: .45, marginTop: 8 },
  totalRight: { maxWidth: 300, textAlign: "right", fontSize: 10.5, lineHeight: 1.55, opacity: .58 },
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "25px 46px", background: "#101010", borderTop: "1px solid rgba(255,255,255,.06)" },
  primaryButton: { border: 0, borderRadius: 999, background: "#f4f4f1", color: "#090909", padding: "14px 20px", fontFamily: "inherit", fontSize: 12, fontWeight: 750, cursor: "pointer", boxShadow: "0 10px 28px rgba(0,0,0,.24)" },
  errorBox: { margin: "20px 46px 0", padding: "13px 15px", borderRadius: 11, background: "rgba(255,70,70,.09)", border: "1px solid rgba(255,90,90,.20)", color: "#ffb0b0", fontSize: 12 },
  error: { color: "#ff9d9d", fontSize: 12 },
  successCard: { width: "min(640px,100%)", padding: 38, borderRadius: 24, background: "#111", border: "1px solid rgba(255,255,255,.14)", color: "#fff", boxShadow: "0 30px 100px rgba(0,0,0,.65)", fontFamily: '"Avenir Next", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  successMark: { width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: "50%", background: "#ffd400", color: "#090909", fontWeight: 800, marginBottom: 20 },
  successTitle: { margin: 0, fontSize: 34, letterSpacing: "-.045em", fontWeight: 700 },
  successText: { margin: "11px 0 24px", color: "rgba(255,255,255,.56)", fontSize: 13, lineHeight: 1.65 },
};