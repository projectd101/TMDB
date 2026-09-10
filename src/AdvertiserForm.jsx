import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { DURATION_TIERS, priceForDuration, formatCents } from "./pricing";

// Pay-first flow:
// 1. Pick a fixed duration (24h / 3 days / 7 days) — that's all that's
//    needed up front. Price is flat and re-verified server-side.
// 2. We create a lightweight "skeleton" campaign row (create_checkout_campaign)
//    and open Paddle checkout for it.
// 3. The instant Paddle's checkout completes, we call get-setup-link with
//    the transaction id (unguessable, only known to this browser) to fetch
//    the one-time setup token, then redirect straight to /setup?token=...
//    No email, no login — same tab, same second.
export default function AdvertiserForm({ onDone }) {
  const [durationHours, setDurationHours] = useState(72);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);
  const [pendingCampaignId, setPendingCampaignId] = useState(null);
  const [pendingTransactionId, setPendingTransactionId] = useState(null);

  const priceCents = priceForDuration(durationHours) ?? 0;

  // Paddle's checkout.completed event is wired globally in main.jsx
  // (eventCallback belongs on Paddle.Initialize(), not Checkout.open()) and
  // rebroadcast as a plain browser event, with the transaction id attached
  // when Paddle provides one. We fall back to the transaction id we already
  // have in state, since we know exactly which checkout we just opened.
  useEffect(() => {
    function handleCheckoutCompleted(e) {
      const transactionId = e?.detail?.transactionId || pendingTransactionId;
      if (transactionId) {
        redirectToSetup(transactionId);
      }
    }
    window.addEventListener("pandora:checkout-completed", handleCheckoutCompleted);
    return () => window.removeEventListener("pandora:checkout-completed", handleCheckoutCompleted);
  }, [pendingTransactionId]);

  async function redirectToSetup(transactionId) {
    setFinalizing(true);
    setFinalizeError(null);

    try {
      const { data, error } = await supabase.functions.invoke("get-setup-link", {
        body: { transaction_id: transactionId },
      });

      if (error || !data) {
        throw new Error("Could not finalize your campaign.");
      }

      if (data.ready && data.setup_token) {
        window.location.href = `${window.location.origin}/setup?token=${encodeURIComponent(data.setup_token)}`;
        return;
      }

      // Payment recorded but the webhook hasn't landed yet (rare, ~1-2s).
      // Give it one more shot before asking the advertiser to refresh.
      setFinalizeError(
        "Payment received — finishing setup, this can take a few seconds. Please wait…"
      );
      setTimeout(() => redirectToSetup(transactionId), 3000);
    } catch (err) {
      setFinalizeError(
        err.message || "Payment received, but we couldn't open your setup page automatically. Please refresh — your campaign is safe."
      );
    } finally {
      setFinalizing(false);
    }
  }

  function validate() {
    if (!priceForDuration(durationHours)) return "Choose a valid duration.";
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
      // Server computes and stores the real price — the client value is
      // only used for the "Continue to payment" button copy.
      const { data, error } = await supabase.rpc("create_checkout_campaign", {
        p_slot: "left",
        p_duration_hours: durationHours,
      });

      if (error || !data?.campaign_id) {
        throw new Error(error?.message || "Could not start your campaign.");
      }

      setPendingCampaignId(data.campaign_id);
      await startCheckout(data.campaign_id);
    } catch (err) {
      setSubmitError(err.message || "Could not start your campaign. Please try again.");
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

      if (fnError || !fnData?.transaction_id) {
        setCheckoutError("Could not start checkout. Please try again.");
        return;
      }

      setPendingTransactionId(fnData.transaction_id);

      if (window.Paddle) {
        window.Paddle.Checkout.open({ transactionId: fnData.transaction_id });
      } else {
        setCheckoutError("Payment system didn't load. Refresh the page and try again.");
      }
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
          <h1 style={styles.title}>Put your launch on the billboard.</h1>
          <p style={styles.subtitle}>
            Choose how long you want to run. The moment payment is
            confirmed, you'll be taken straight to add your brand, logo,
            video and destination — no need to have any of that ready yet.
          </p>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeading}>
          <div>
            <h2 style={styles.sectionTitle}>How long?</h2>
            <p style={styles.sectionHint}>Pick a fixed duration for your billboard placement — a flat price, no click-counting.</p>
          </div>
        </div>

        <div style={styles.presetGrid}>
          {DURATION_TIERS.map((tier) => (
            <button
              key={tier.hours}
              type="button"
              onClick={() => setDurationHours(tier.hours)}
              style={{
                ...styles.preset,
                ...(durationHours === tier.hours ? styles.presetActive : {}),
              }}
            >
              <strong>{tier.label}</strong>
              <span>{formatCents(tier.priceCents)}</span>
            </button>
          ))}
        </div>

        <div style={styles.totalBox}>
          <div>
            <span style={styles.totalLabel}>Campaign price</span>
            <strong style={styles.totalPrice}>{formatCents(priceCents)}</strong>
            <span style={styles.totalSub}>
              {DURATION_TIERS.find((t) => t.hours === durationHours)?.label} on the billboard
            </span>
          </div>
          <div style={styles.totalRight}>
            <span>Flat rate — live for the full duration regardless of traffic</span>
            <small>Final price is confirmed securely at checkout.</small>
          </div>
        </div>
      </div>

      {submitError && <div style={styles.errorBox}>{submitError}</div>}

      <div style={styles.footer}>
        <div>
          <strong>Ready to launch?  </strong>
          <span>You'll add your brand details right after payment.</span>
        </div>
        <button type="submit" style={styles.primaryButton} disabled={submitting}>
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
  preset: { border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(180deg,#151515,#111)", color: "#fff", borderRadius: 13, padding: "17px 14px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" },
  presetActive: { borderColor: "#ffd400", background: "rgba(255,212,0,.09)" },
  totalBox: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "20px 21px", borderRadius: 16, background: "#f5f5f2", color: "#000" },
  totalLabel: { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".02em", opacity: .52, marginBottom: 4 },
  totalPrice: { display: "block", fontSize: 31, lineHeight: 1, letterSpacing: "-.045em" },
  totalSub: { display: "block", fontSize: 11, opacity: .50, marginTop: 4 },
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
