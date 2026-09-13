import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const CAMPAIGN_TYPES = [
  { value: "new_launch", title: "New launch", description: "Something that just launched." },
  { value: "coming_soon", title: "Coming soon", description: "Build anticipation before launch day." },
  { value: "anticipated", title: "Anticipated", description: "Put an upcoming product on the radar." },
  { value: "trending", title: "Trending", description: "Get attention around something people are talking about." },
  { value: "deal", title: "Exclusive deal", description: "Drive visits with a special offer." },
  { value: "try_it", title: "Try it", description: "Give people a reason to test your product." },
];

const initialForm = {
  campaignType: "new_launch",
  brandName: "",
  productTitle: "",
  description: "",
  contactEmail: "",
  logoFile: null,
  videoFile: null,
  destinationUrl: "",
  brandMotto: "",
  offerEnabled: false,
  discountPercent: "20",
  discountCode: "",
  offerExpiry: "",
};

// Post-payment setup page: reached via a one-time link
// (yoursite.com/setup?token=xxxx) sent after Dodo Payments confirms payment.
// The token itself is the credential — no login required, same pattern as
// a password-reset link. It is validated server-side by submit_campaign_setup
// and invalidated the moment it's used successfully.
export default function CampaignSetup({ token }) {
  const [form, setForm] = useState(initialForm);
  const [logoPreview, setLogoPreview] = useState(null);
  const [videoName, setVideoName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmitError(null);
  }

  function handleLogo(file) {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    update("logoFile", file || null);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleVideo(file) {
    update("videoFile", file || null);
    setVideoName(file?.name || "");
  }

  function validate() {
    if (!form.brandName.trim()) return "Enter your brand or company name.";
    if (!form.productTitle.trim()) return "Enter the product or launch title.";
    if (!form.description.trim()) return "Add a short description of what you're launching.";
    if (!form.contactEmail.trim()) return "Enter a contact email.";
    if (!form.logoFile) return "Upload your brand logo.";
    if (!form.videoFile) return "Upload the campaign video.";
    if (form.logoFile && form.logoFile.size > 2 * 1024 * 1024) return "Logo must be 2MB or smaller.";
    if (form.videoFile && form.videoFile.size > 50 * 1024 * 1024) return "Campaign video must be 50MB or smaller.";
    if (!form.destinationUrl.trim()) return "Enter the link visitors should open.";
    if (!/^https?:\/\/.+/i.test(form.destinationUrl.trim())) {
      return "Destination link must start with http:// or https://.";
    }
    if (form.offerEnabled) {
      const discount = Number(form.discountPercent);
      if (!discount || discount < 1 || discount > 100) {
        return "Choose a discount between 1% and 100%.";
      }
    }
    return null;
  }

  async function uploadFile(bucket, file, prefix) {
    const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });

    if (error) throw new Error(`Could not upload ${prefix === "logos" ? "logo" : "video"}. Please try again.`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
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

    try {
      const [logoUrl, videoUrl] = await Promise.all([
        uploadFile("campaign-logos", form.logoFile, "logos"),
        uploadFile("campaign-videos", form.videoFile, "videos"),
      ]);

      const discountPercent = form.offerEnabled ? Number(form.discountPercent) : null;
      const offerExpiry = form.offerEnabled && form.offerExpiry
        ? new Date(form.offerExpiry).toISOString()
        : null;

      const { data, error } = await supabase.rpc("submit_campaign_setup", {
        p_token: token,
        p_brand_name: form.brandName.trim(),
        p_contact_email: form.contactEmail.trim(),
        p_destination_url: form.destinationUrl.trim(),
        p_campaign_type: form.campaignType,
        p_product_title: form.productTitle.trim(),
        p_description: form.description.trim(),
        p_logo_url: logoUrl,
        p_video_url: videoUrl,
        p_brand_motto: form.description.trim().slice(0, 80) || null,
        p_discount_percent: discountPercent,
        p_discount_code: form.offerEnabled && form.discountCode.trim() ? form.discountCode.trim() : null,
        p_offer_expires_at: offerExpiry,
      });

      if (error) throw new Error(error.message || "Could not save your campaign.");

      if (!data?.ok) {
        const reasons = {
          invalid_token: "This setup link isn't valid. Check the link from your payment confirmation.",
          not_awaiting_setup: "This campaign has already been set up or isn't ready yet.",
          token_expired: "This setup link has expired. Contact us and we'll issue a new one.",
        };
        throw new Error(reasons[data?.reason] || "Could not save your campaign.");
      }

      setDone(true);
    } catch (err) {
      setSubmitError(err.message || "Could not save your campaign. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={styles.page}>
        <div style={styles.successCard}>
          <div style={styles.successMark}>✓</div>
          <div style={styles.eyebrow}>All set</div>
          <h2 style={styles.successTitle}>You've successfully set up your campaign.</h2>
          <p style={styles.successText}>
            Your campaign is saved. —
            You can see it live on the billboard.
          </p>
          <a href="/" style={styles.primaryLinkButton}>
            Back to billboard →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <form style={styles.shell} onSubmit={handleSubmit}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Payment received</div>
            <h1 style={styles.title}>Finish setting up your campaign.</h1>
            <p style={styles.subtitle}>
              This is the last step — tell us what you're promoting and where
              to send people.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <h2 style={styles.sectionTitle}>What are you promoting?</h2>
              <p style={styles.sectionHint}>Choose the format that best fits your campaign.</p>
            </div>
          </div>

          <div style={styles.typeGrid}>
            {CAMPAIGN_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => update("campaignType", type.value)}
                style={{
                  ...styles.typeCard,
                  ...(form.campaignType === type.value ? styles.typeCardActive : {}),
                }}
              >
                <strong>{type.title}</strong>
                <span>{type.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <h2 style={styles.sectionTitle}>Tell people what it is</h2>
              <p style={styles.sectionHint}>This is the information used for discovery and the billboard creative.</p>
            </div>
          </div>

          <div style={styles.twoCol}>
            <Field label="Brand / company name">
              <input
                style={styles.input}
                value={form.brandName}
                onChange={(e) => update("brandName", e.target.value)}
                placeholder="Acme"
                maxLength={60}
              />
            </Field>

            <Field label="Product / launch title">
              <input
                style={styles.input}
                value={form.productTitle}
                onChange={(e) => update("productTitle", e.target.value)}
                placeholder="Acme AI"
                maxLength={80}
              />
            </Field>
          </div>

          <Field label="Short description">
            <textarea
              style={{ ...styles.input, minHeight: 92, resize: "vertical" }}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What is it, who is it for, and why should someone care?"
              maxLength={300}
            />
            <span style={styles.counter}>{form.description.length}/300</span>
          </Field>

          <div style={styles.twoCol}>
            <FileField
              label="Brand logo"
              hint="PNG, JPG or WEBP · max 2MB"
              accept="image/png,image/jpeg,image/webp"
              file={form.logoFile}
              onChange={handleLogo}
              preview={logoPreview}
            />
            <FileField
              label="Campaign video"
              hint="MP4 or WEBM · max 50MB"
              accept="video/mp4,video/webm"
              file={form.videoFile}
              onChange={handleVideo}
              videoName={videoName}
            />
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <h2 style={styles.sectionTitle}>Where should discovery lead?</h2>
              <p style={styles.sectionHint}>Send visitors to your product, waitlist, store, or launch page.</p>
            </div>
          </div>

          <Field label="Destination link">
            <input
              style={styles.input}
              type="url"
              value={form.destinationUrl}
              onChange={(e) => update("destinationUrl", e.target.value)}
              placeholder="https://yourproduct.com"
            />
          </Field>

          <Field label="Contact email">
            <input
              style={styles.input}
              type="email"
              value={form.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              placeholder="you@company.com"
            />
          </Field>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <h2 style={styles.sectionTitle}>Give people a reason to click</h2>
              <p style={styles.sectionHint}>Offers are optional. You supply and honor the offer.</p>
            </div>
          </div>

          <button
            type="button"
            style={styles.offerToggle}
            onClick={() => update("offerEnabled", !form.offerEnabled)}
          >
            <span style={{ ...styles.switch, ...(form.offerEnabled ? styles.switchOn : {}) }}>
              <span style={{ ...styles.switchKnob, ...(form.offerEnabled ? styles.switchKnobOn : {}) }} />
            </span>
            <span>
              <strong>{form.offerEnabled ? "Exclusive offer enabled" : "No offer?  "}</strong>
              <small>{form.offerEnabled ? "Show a discount or launch offer on the billboard." : " "}</small>
            </span>
          </button>

          {form.offerEnabled && (
            <div style={styles.offerBox}>
              <div style={styles.discountPicker}>
                {[10, 20, 25, 30, 50].map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => update("discountPercent", String(value))}
                    style={{
                      ...styles.discountButton,
                      ...(Number(form.discountPercent) === value ? styles.discountButtonActive : {}),
                    }}
                  >
                    {value}% off
                  </button>
                ))}
              </div>

              <div style={styles.twoCol}>
                <Field label="Custom discount">
                  <div style={styles.percentInput}>
                    <input
                      style={{ ...styles.input, marginTop: 0 }}
                      type="number"
                      min="1"
                      max="100"
                      value={form.discountPercent}
                      onChange={(e) => update("discountPercent", e.target.value)}
                    />
                    <span>%</span>
                  </div>
                </Field>

                <Field label="Discount / offer code (optional)">
                  <input
                    style={styles.input}
                    value={form.discountCode}
                    onChange={(e) => update("discountCode", e.target.value)}
                    placeholder="launch20"
                    maxLength={40}
                  />
                </Field>
              </div>

              <Field label="Offer expiry (optional)">
                <input
                  style={{ ...styles.input, ...styles.dateInput }}
                  type="datetime-local"
                  value={form.offerExpiry}
                  onChange={(e) => update("offerExpiry", e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>

        {submitError && <div style={styles.errorBox}>{submitError}</div>}

        <div style={styles.footer}>
          <div>
            <strong>Last step.  </strong>
            <span>Your campaign goes live right after this.</span>
          </div>
          <button type="submit" style={styles.primaryButton} disabled={submitting}>
            {submitting ? "Saving campaign…" : "Publish campaign →"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function FileField({ label, hint, accept, file, onChange, preview, videoName }) {
  return (
    <label style={styles.fileField}>
      <span style={styles.fieldLabel}>{label}</span>
      <span style={styles.fileDrop}>
        {preview ? (
          <img src={preview} alt="Logo preview" style={styles.logoPreview} />
        ) : (
          <span style={styles.uploadIcon}>↑</span>
        )}
        <span style={styles.fileText}>
          <strong>{file ? file.name : `Upload ${label.toLowerCase()}`}</strong>
          <small>{videoName || hint}</small>
        </span>
        <input
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          style={styles.hiddenFile}
        />
      </span>
    </label>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "50px 20px",
    boxSizing: "border-box",
    background: "radial-gradient(circle at 50% 20%, #191919 0%, #000 68%)",
  },
  shell: {
    width: "min(980px, 100%)",
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
  title: { margin: 0, maxWidth: 760, fontSize: "clamp(30px, 4.4vw, 46px)", lineHeight: 1.05, letterSpacing: "-.05em", fontWeight: 750, fontFamily: '"Avenir Next", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  subtitle: { margin: "15px 0 0", maxWidth: 690, color: "rgba(255,255,255,.57)", fontSize: 14, lineHeight: 1.65 },
  section: { padding: "38px 46px 42px", borderBottom: "1px solid rgba(255,255,255,.075)", background: "#0b0b0b" },
  sectionHeading: { marginBottom: 25 },
  sectionTitle: { margin: 0, fontSize: 21, lineHeight: 1.2, letterSpacing: "-.025em", fontWeight: 700 },
  sectionHint: { margin: "7px 0 0", fontSize: 12.5, color: "rgba(255,255,255,.42)", lineHeight: 1.55 },
  typeGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 },
  typeCard: {
    display: "grid", gap: 8, alignContent: "start", textAlign: "left", border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(180deg,#151515,#111)",
    color: "#fff", borderRadius: 15, padding: "18px 17px", cursor: "pointer", minHeight: 108,
    fontFamily: "inherit", transition: "border-color .18s ease, background .18s ease, transform .18s ease",
  },
  typeCardActive: { borderColor: "#ffd400", background: "linear-gradient(180deg,rgba(255,212,0,.12),rgba(255,212,0,.045))", boxShadow: "inset 0 0 0 1px rgba(255,212,0,.10)" },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 18 },
  field: { display: "block", marginBottom: 20 },
  fieldLabel: { display: "block", marginBottom: 8, fontSize: 11, fontWeight: 650, color: "rgba(255,255,255,.62)", letterSpacing: ".005em" },
  input: {
    display: "block", width: "100%", boxSizing: "border-box", padding: "14px 15px",
    borderRadius: 11, border: "1px solid rgba(255,255,255,.14)", background: "#151515",
    color: "#fff", outline: "none", fontFamily: "inherit", fontSize: 13, lineHeight: 1.4,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.025), 0 1px 2px rgba(0,0,0,.2)",
  },
  dateInput: { colorScheme: "dark", WebkitAppearance: "auto" },
  counter: { display: "block", marginTop: 6, textAlign: "right", fontSize: 10, color: "rgba(255,255,255,.28)" },
  fileField: { display: "block", marginBottom: 2 },
  fileDrop: {
    position: "relative", minHeight: 104, display: "flex", alignItems: "center", gap: 15, padding: 15,
    border: "1px dashed rgba(255,255,255,.22)", borderRadius: 13, background: "linear-gradient(180deg,#151515,#111)", cursor: "pointer",
  },
  uploadIcon: { width: 44, height: 44, borderRadius: 11, display: "grid", placeItems: "center", border: "1px solid rgba(255,212,0,.30)", background: "rgba(255,212,0,.07)", color: "#ffd400", fontSize: 20 },
  logoPreview: { width: 58, height: 58, objectFit: "contain", borderRadius: 10, background: "#fff", padding: 5, boxSizing: "border-box" },
  fileText: { minWidth: 0, display: "grid", gap: 6 },
  hiddenFile: { position: "absolute", inset: 0, opacity: 0, cursor: "pointer" },
  offerToggle: {
    width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 14,
    border: "1px solid rgba(255,255,255,.12)", background: "#121212", color: "#fff", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
  },
  offerBox: { marginTop: 14, padding: 19, borderRadius: 15, background: "#101010", border: "1px solid rgba(255,255,255,.10)" },
  switch: { width: 36, height: 21, borderRadius: 99, background: "rgba(255,255,255,.14)", padding: 2, boxSizing: "border-box", flex: "0 0 auto" },
  switchOn: { background: "#fff" },
  switchKnob: { display: "block", width: 17, height: 17, borderRadius: "50%", background: "#000", transform: "translateX(0)", transition: "transform .18s ease" },
  switchKnobOn: { transform: "translateX(15px)" },
  discountPicker: { display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 20 },
  discountButton: { border: "1px solid rgba(255,255,255,.12)", background: "#151515", color: "rgba(255,255,255,.70)", borderRadius: 10, padding: "10px 13px", cursor: "pointer", fontSize: 11, fontWeight: 650, fontFamily: "inherit" },
  discountButtonActive: { background: "#ffd400", color: "#080808", borderColor: "#ffd400" },
  percentInput: { display: "flex", alignItems: "center", gap: 9 },
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "25px 46px", background: "#101010", borderTop: "1px solid rgba(255,255,255,.06)" },
  primaryButton: { border: 0, borderRadius: 999, background: "#f4f4f1", color: "#090909", padding: "14px 20px", fontFamily: "inherit", fontSize: 12, fontWeight: 750, cursor: "pointer", boxShadow: "0 10px 28px rgba(0,0,0,.24)" },
  primaryLinkButton: { display: "inline-block", textDecoration: "none", border: 0, borderRadius: 999, background: "#f4f4f1", color: "#090909", padding: "14px 20px", fontFamily: "inherit", fontSize: 12, fontWeight: 750, cursor: "pointer", boxShadow: "0 10px 28px rgba(0,0,0,.24)" },
  errorBox: { margin: "20px 46px 0", padding: "13px 15px", borderRadius: 11, background: "rgba(255,70,70,.09)", border: "1px solid rgba(255,90,90,.20)", color: "#ffb0b0", fontSize: 12 },
  successCard: { width: "min(640px,100%)", padding: 38, borderRadius: 24, background: "#111", border: "1px solid rgba(255,255,255,.14)", color: "#fff", boxShadow: "0 30px 100px rgba(0,0,0,.65)", fontFamily: '"Avenir Next", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  successMark: { width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: "50%", background: "#ffd400", color: "#090909", fontWeight: 800, marginBottom: 20 },
  successTitle: { margin: 0, fontSize: 34, letterSpacing: "-.045em", fontWeight: 700 },
  successText: { margin: "11px 0 24px", color: "rgba(255,255,255,.56)", fontSize: 13, lineHeight: 1.65 },
};
