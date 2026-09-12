import React from "react";
import { DURATION_TIERS, formatCents } from "./pricing";

const siteName = "The Million Dollar Billboard";

const styles = {
  page: {
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: "34px 20px 80px",
    background:
      "radial-gradient(circle at 15% 0%, rgba(227,6,19,.08), transparent 28%), radial-gradient(circle at 85% 0%, rgba(255,212,0,.055), transparent 24%), #050505",
    color: "#fff",
    fontFamily:
      "Avenir Next, Avenir, Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  shell: {
    width: "min(920px, 100%)",
    margin: "0 auto",
    background: "#101010",
    border: "1px solid rgba(255,255,255,.13)",
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 30px 100px rgba(0,0,0,.62)",
  },

  header: {
    position: "relative",
    padding: "34px 36px 32px",
    borderBottom: "1px solid rgba(255,255,255,.09)",
    background:
      "radial-gradient(circle at 12% 0%, rgba(227,6,19,.12), transparent 34%), radial-gradient(circle at 88% 0%, rgba(255,212,0,.09), transparent 30%), #111",
  },

  headerTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 34,
  },

  back: {
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.055)",
    color: "#fff",
    borderRadius: 999,
    padding: "9px 13px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  legalFooter: {
    marginTop: 36,
    paddingTop: 20,
    borderTop: "1px solid rgba(255,255,255,.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontSize: 11,
  },

  legalFooterLink: {
    color: "rgba(255,255,255,.45)",
    textDecoration: "none",
  },

  legalFooterDot: {
    color: "rgba(255,255,255,.22)",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "rgba(255,255,255,.55)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".08em",
  },

  brandMark: {
    width: 8,
    height: 8,
    borderRadius: 2,
    background: "#ffd400",
    boxShadow: "8px 0 0 #e30613",
  },

  eyebrow: {
    margin: "0 0 10px",
    color: "#ffd400",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: ".12em",
  },

  title: {
    margin: 0,
    maxWidth: 760,
    fontSize: "clamp(34px, 5vw, 52px)",
    lineHeight: 1,
    letterSpacing: "-.055em",
    fontWeight: 750,
    color: "#fff",
  },

  intro: {
    maxWidth: 690,
    margin: "14px 0 0",
    color: "rgba(255,255,255,.56)",
    fontSize: 14,
    lineHeight: 1.65,
  },

  updated: {
    marginTop: 18,
    color: "rgba(255,255,255,.30)",
    fontSize: 10,
  },

  content: {
    padding: "4px 36px 0",
    background: "#0d0d0d",
  },

  section: {
    padding: "30px 0 34px",
    borderBottom: "1px solid rgba(255,255,255,.075)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 0,
    marginBottom: 18,
  },

  accent: {
    width: 3,
    minWidth: 3,
    height: 24,
    marginTop: 2,
    borderRadius: 99,
    background: "#e30613",
    boxShadow: "0 0 18px rgba(227,6,19,.28)",
  },

  sectionTitle: {
    margin: 0,
    color: "#fff",
    fontSize: 20,
    lineHeight: 1.15,
    letterSpacing: "-.025em",
    fontWeight: 700,
  },

  sectionLead: {
    margin: "5px 0 0",
    color: "rgba(255,255,255,.34)",
    fontSize: 11,
    lineHeight: 1.5,
  },

  p: {
    margin: "0 0 17px",
    color: "rgba(255,255,255,.62)",
    fontSize: 14,
    lineHeight: 1.8,
  },

  strong: {
    color: "#fff",
    fontWeight: 700,
  },

  list: {
    margin: 0,
    paddingLeft: 21,
  },

  li: {
    marginBottom: 11,
    paddingLeft: 4,
    color: "rgba(255,255,255,.61)",
    fontSize: 14,
    lineHeight: 1.75,
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 11,
    marginTop: 22,
  },

  card: {
    padding: "19px 19px 20px",
    border: "1px solid rgba(255,255,255,.11)",
    borderRadius: 15,
    background:
      "linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.018))",
    boxShadow: "0 14px 38px rgba(0,0,0,.16)",
  },

  cardKicker: {
    marginBottom: 11,
    color: "#ffd400",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: ".1em",
  },

  cardTitle: {
    margin: 0,
    color: "#fff",
    fontSize: 14,
    lineHeight: 1.3,
    fontWeight: 700,
    letterSpacing: "-.01em",
  },

  cardText: {
    margin: "7px 0 0",
    color: "rgba(255,255,255,.46)",
    fontSize: 12,
    lineHeight: 1.65,
  },

  callout: {
    marginTop: 22,
    padding: "18px 19px",
    borderRadius: 15,
    border: "1px solid rgba(255,212,0,.20)",
    background:
      "linear-gradient(135deg, rgba(255,212,0,.075), rgba(227,6,19,.035))",
  },

  calloutTitle: {
    margin: 0,
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
  },

  calloutText: {
    margin: "7px 0 0",
    color: "rgba(255,255,255,.48)",
    fontSize: 12,
    lineHeight: 1.65,
  },

  priceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 11,
    marginTop: 22,
  },

  priceCard: {
    padding: 20,
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 16,
    background: "#151515",
  },

  priceValue: {
    margin: 0,
    color: "#fff",
    fontSize: 29,
    lineHeight: 1,
    fontWeight: 750,
    letterSpacing: "-.045em",
  },

  priceLabel: {
    marginTop: 9,
    color: "rgba(255,255,255,.43)",
    fontSize: 11,
    lineHeight: 1.55,
  },

  example: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    background: "#fff",
    color: "#090909",
  },

  exampleLabel: {
    marginBottom: 8,
    color: "rgba(0,0,0,.46)",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: ".1em",
  },

  examplePrice: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 750,
    letterSpacing: "-.04em",
  },

  exampleSub: {
    margin: "7px 0 0",
    color: "rgba(0,0,0,.48)",
    fontSize: 11,
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    padding: "20px 36px",
    background: "#111",
    borderTop: "1px solid rgba(255,255,255,.06)",
  },

  footerText: {
    color: "rgba(255,255,255,.30)",
    fontSize: 10,
    lineHeight: 1.5,
  },

  footerMark: {
    color: "#ffd400",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: ".08em",
  },
};

function PageShell({ onBack, children }) {
  return (
    <div style={styles.page}>
      <style>{`
        .legal-card {
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
          will-change: transform;
        }

        .legal-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 212, 0, .30) !important;
          background: linear-gradient(
            145deg,
            rgba(255, 212, 0, .075),
            rgba(255, 255, 255, .025)
          ) !important;
          box-shadow:
            0 18px 45px rgba(0, 0, 0, .34),
            0 0 0 1px rgba(255, 212, 0, .035);
        }

        .pricing-example {
          transition:
            transform 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .pricing-example:hover {
          transform: translateY(-3px);
          background: linear-gradient(
            135deg,
            #fff8cf 0%,
            #ffffff 52%,
            #fff3b0 100%
          ) !important;
          box-shadow:
            0 20px 48px rgba(0, 0, 0, .40),
            0 0 30px rgba(255, 212, 0, .08);
        }

        .legal-card:hover h3 {
          color: #fff;
        }

        button {
          transition:
            transform 160ms ease,
            background 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        button:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 212, 0, .35) !important;
          box-shadow: 0 10px 28px rgba(0,0,0,.28);
        }
      `}</style>
      <div style={{ ...styles.shell, width: "min(860px, 100%)" }}>
        <main style={{ ...styles.content, padding: "8px 42px 30px" }}>
          <button type="button" style={styles.back} onClick={onBack}>
            ← Back
          </button>
          {children}
          <div style={styles.legalFooter}>
            <a href="/privacy" style={styles.legalFooterLink}>
              Privacy Policy
            </a>
            <span style={styles.legalFooterDot}>·</span>
            <a href="/refunds" style={styles.legalFooterLink}>
              Refund Policy
            </a>
            <span style={styles.legalFooterDot}>·</span>
            <a href="/terms" style={styles.legalFooterLink}>
              Terms
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}

function Section({ title, lead, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>{title}</h2>
          {lead && <p style={styles.sectionLead}>{lead}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function AboutPage({ onBack }) {
  return (
    <PageShell onBack={onBack}>
      <Section
        title="A different kind of advertising"
        lead="Less feed. More moment."
      >
        <p style={styles.p}>
          <strong style={styles.strong}>{siteName}</strong> turns product
          discovery into a public, memorable moment. Instead of another
          scrolling feed, visitors see a live billboard built around what is
          new, what is coming, what is gaining attention and what is worth
          trying.
        </p>

        <p style={styles.p}>
          A founder can introduce something before launch. A company can put
          a new product in front of people on launch day. A brand can also
          use the billboard to give visitors a direct path to a product,
          waitlist, store, signup or special offer.
        </p>
      </Section>

      <Section title="How it works" lead="From campaign to discovery.">
        <div style={styles.cardGrid}>
          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>01</div>
            <h3 style={styles.cardTitle}>Submit</h3>
            <p style={styles.cardText}>
              Share your product, launch, offer or upcoming announcement.
            </p>
          </div>

          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>02</div>
            <h3 style={styles.cardTitle}>Review</h3>
            <p style={styles.cardText}>
              Your campaign is reviewed and scheduled for billboard
              placement.
            </p>
          </div>

          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>03</div>
            <h3 style={styles.cardTitle}>Discover</h3>
            <p style={styles.cardText}>
              Visitors encounter your campaign directly from the live
              billboard.
            </p>
          </div>

          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>04</div>
            <h3 style={styles.cardTitle}>Continue</h3>
            <p style={styles.cardText}>
              A click can take visitors to your product page, store,
              waitlist or signup destination.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Built for discovery" lead="Every campaign has a reason to be here.">
        <p style={styles.p}>
          The goal is simple: make discovering something new feel like an
          event. The billboard gives launches and products a physical,
          memorable presence while giving visitors a reason to stop and look.
        </p>

        <div style={styles.cardGrid}>
          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>For visitors</div>
            <h3 style={styles.cardTitle}>Find what is next.</h3>
            <p style={styles.cardText}>
              Discover early launches, products gaining momentum and offers
              from participating brands.
            </p>
          </div>

          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>For founders and brands</div>
            <h3 style={styles.cardTitle}>Give your launch a moment.</h3>
            <p style={styles.cardText}>
              Put your product in front of people before launch, on launch
              day, during a growth moment or when you have something special
              to share.
            </p>
          </div>
        </div>
      </Section>
    </PageShell>
  );
}

export function PrizesPage({ onBack }) {
  return (
    <PageShell onBack={onBack}>
      <Section
        title="Campaign moments"
        lead="Choose the story your campaign tells."
      >
        <div style={styles.cardGrid}>
          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>New launch</div>
            <h3 style={styles.cardTitle}>Something just arrived.</h3>
            <p style={styles.cardText}>
              Products and services that have just launched and are ready to
              discover.
            </p>
          </div>

          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>Coming soon</div>
            <h3 style={styles.cardTitle}>Build anticipation.</h3>
            <p style={styles.cardText}>
              Give people an early look at a product preparing to launch.
            </p>
          </div>

          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>Anticipated</div>
            <h3 style={styles.cardTitle}>Put it on the radar.</h3>
            <p style={styles.cardText}>
              Highlight products already generating attention before they
              officially arrive.
            </p>
          </div>

          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>Trending</div>
            <h3 style={styles.cardTitle}>Capture the momentum.</h3>
            <p style={styles.cardText}>
              Put a spotlight on products and launches people are talking
              about right now.
            </p>
          </div>

          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>Exclusive deal</div>
            <h3 style={styles.cardTitle}>Give people a reason to click.</h3>
            <p style={styles.cardText}>
              Share a special promotion or discount through your campaign.
            </p>
          </div>

          <div className="legal-card" style={styles.card}>
            <div style={styles.cardKicker}>Try it</div>
            <h3 style={styles.cardTitle}>Invite the next step.</h3>
            <p style={styles.cardText}>
              Encourage visitors to test, experience or explore something
              new.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Exclusive offers" lead="Offers are supplied by participating advertisers.">
        <p style={styles.p}>
          Some advertisers may provide discounts, promotional codes or other
          special offers specifically for people who discover their campaign
          through the billboard.
        </p>

        <div className="legal-card" style={styles.callout}>
          <h3 style={styles.calloutTitle}>The advertiser sets the terms.</h3>
          <p style={styles.calloutText}>
            Advertisers are responsible for the terms, availability, validity
            and fulfillment of their own offers. Check the advertiser's
            destination for the details of each campaign.
          </p>
        </div>
      </Section>

      <Section title="Before launch is part of the story" lead="A product does not need to be live yet.">
        <p style={styles.p}>
          Founders can use the billboard to announce an upcoming product,
          collect interest, build a waitlist or invite people to follow the
          launch before release.
        </p>
      </Section>
    </PageShell>
  );
}

export function TermsPage({ onBack }) {
  return (
    <PageShell onBack={onBack}>
      <Section title="The service">
        <p style={styles.p}>
          {siteName} provides a digital billboard and product-discovery
          platform where advertisers can showcase products, services,
          launches, announcements and promotional offers.
        </p>

        <p style={styles.p}>
          Campaigns may link to third-party websites, stores, forms,
          waitlists, applications or other destinations operated by the
          advertiser.
        </p>
      </Section>

      <Section title="Advertiser campaigns">
        <ul style={styles.list}>
          <li style={styles.li}>
            Advertisers are responsible for the accuracy of the information
            submitted for their campaign.
          </li>
          <li style={styles.li}>
            Advertisers must have the right to use submitted logos, images,
            videos, product information and other campaign materials.
          </li>
          <li style={styles.li}>
            Destination links must lead to legitimate and lawful destinations.
          </li>
          <li style={styles.li}>
            We may review, reject, pause or remove campaigns that violate
            these terms or create a risk to visitors or the service.
          </li>
          <li style={styles.li}>
            Campaign placement and availability depend on the billboard's
            current schedule and operating conditions.
          </li>
        </ul>
      </Section>

      <Section title="Offers and discounts">
        <p style={styles.p}>
          Advertisers may provide promotional codes, discounts or other
          special offers as part of their campaigns.
        </p>

        <ul style={styles.list}>
          <li style={styles.li}>
            Advertisers are responsible for fulfilling their advertised
            offers.
          </li>
          <li style={styles.li}>
            Offer expiration dates, eligibility requirements and redemption
            conditions are determined by the advertiser.
          </li>
          <li style={styles.li}>
            An offer may be limited in quantity, time or availability where
            disclosed by the advertiser.
          </li>
          <li style={styles.li}>
            We do not guarantee that an advertiser's offer will remain
            available after you leave the billboard.
          </li>
        </ul>
      </Section>

      <Section title="Visitors">
        <p style={styles.p}>
          Visitors may browse campaigns and interact with billboard content
          for legitimate purposes.
        </p>

        <p style={styles.p}>
          You may not interfere with the service, attempt to manipulate
          campaign metrics, use automated systems to generate artificial
          interactions, or attempt to gain unauthorized access to the
          platform or its systems.
        </p>
      </Section>

      <Section title="Third-party destinations">
        <p style={styles.p}>
          Campaigns may take you to websites and services operated by third
          parties. Those destinations have their own terms, privacy policies
          and purchasing or signup processes.
        </p>

        <p style={styles.p}>
          {siteName} is not responsible for the content, availability,
          security, products, services or transactions provided by a
          third-party destination.
        </p>
      </Section>

      <Section title="Content">
        <p style={styles.p}>
          You may not submit or distribute content that is illegal,
          fraudulent, deceptive, infringing, hateful, sexually explicit,
          malicious or otherwise inappropriate for a public advertising
          platform.
        </p>
      </Section>

      <Section title="Availability">
        <p style={styles.p}>
          We aim to keep the billboard and related services available, but we
          do not guarantee uninterrupted operation, campaign visibility,
          traffic levels or any particular commercial result. Your campaign
          runs for the fixed duration you purchased regardless of traffic.
        </p>
      </Section>

      <Section title="Changes">
        <p style={styles.p}>
          We may update these terms as the service evolves. The version
          published on this page is the version currently applicable to the
          service.
        </p>
      </Section>
    </PageShell>
  );
}

export function PricingsPage({ onBack }) {
  return (
    <PageShell onBack={onBack}>
      <Section title="How campaign pricing works" lead="Pick a duration, pay a flat rate, that's it.">
        <p style={styles.p}>
          Campaigns are billed as a flat, fixed fee for a set amount of time
          on the billboard — not per click or per interaction. You know the
          full price before you pay, and it doesn't change based on how much
          traffic your campaign gets.
        </p>
      </Section>

      <Section
        title="Duration & pricing"
        lead="Three fixed options — no custom quotes, no hidden fees."
      >
        <div style={styles.cardGrid}>
          {DURATION_TIERS.map((tier) => (
            <div className="legal-card" style={styles.card} key={tier.hours}>
              <div style={styles.cardKicker}>{tier.label}</div>
              <h3 style={styles.cardTitle}>{formatCents(tier.priceCents)}</h3>
              <p style={styles.cardText}>
                Your campaign is live on the billboard for {tier.label},
                for one flat price.
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What your campaign can include" lead="Everything needed to tell the story.">
        <ul style={styles.list}>
          <li style={styles.li}>Brand or company name</li>
          <li style={styles.li}>Product or launch title</li>
          <li style={styles.li}>Product description</li>
          <li style={styles.li}>Logo and campaign video</li>
          <li style={styles.li}>
            Product, store, waitlist or signup destination
          </li>
          <li style={styles.li}>Optional launch date</li>
          <li style={styles.li}>Optional discount or promotional offer</li>
          <li style={styles.li}>
            Optional promotional code and offer expiry
          </li>
        </ul>
      </Section>

      <Section title="Choose your moment" lead="Meet people at the right stage of the journey.">
        <p style={styles.p}>
          Campaigns can be positioned around different stages of a product's
          journey — from a first announcement and coming-soon campaign to a
          launch, a trending moment, a special deal or an invitation to try
          the product.
        </p>

        <div className="legal-card" style={styles.callout}>
          <h3 style={styles.calloutTitle}>Pricing is shown before you pay.</h3>
          <p style={styles.calloutText}>
            Select your campaign type and duration in the advertiser
            form to see the flat campaign price before checkout. Prices may
            change as the platform evolves.
          </p>
        </div>
      </Section>
    </PageShell>
  );
}

export function PrivacyPage({ onBack }) {
  return (
    <PageShell onBack={onBack}>
      <Section title="What we collect">
        <p style={styles.p}>
          As a visitor, we collect basic, non-identifying usage information
          needed to run the billboard — for example the number of people
          currently viewing the site and campaign interaction counts. We do
          not require visitors to create an account or provide personal
          information to view the billboard.
        </p>

        <p style={styles.p}>
          As an advertiser, we collect the information you submit to run a
          campaign: brand or company name, contact email, product details,
          logo and video files, destination link, and any discount or offer
          details you choose to include.
        </p>
      </Section>

      <Section title="Payments">
        <p style={styles.p}>
          Payments are processed by Dodo Payments, our payment provider and
          Merchant of Record. We do not collect or store your card details —
          Dodo Payments handles payment collection and is responsible for
          that data under its own privacy policy and terms.
        </p>

        <p style={styles.p}>
          We store a record of your transaction (such as the amount paid and
          a payment reference) so we can confirm your campaign and provide
          support if needed.
        </p>
      </Section>

      <Section title="How we use campaign information">
        <p style={styles.p}>
          Campaign details you submit (brand name, logo, video, description,
          destination link, offer details) are displayed publicly on the
          billboard as part of the service you're paying for. Your contact
          email is used only to reach you about your campaign — for example
          to confirm setup or resolve an issue — and is not displayed
          publicly or sold to third parties.
        </p>
      </Section>

      <Section title="Third-party services">
        <p style={styles.p}>
          We use Supabase for our database and backend infrastructure, and
          Dodo Payments for payment processing. These providers may process
          data on our behalf as necessary to run the service, under their
          own respective privacy and security practices.
        </p>
      </Section>

      <Section title="Data retention">
        <p style={styles.p}>
          We retain campaign and payment records for as long as needed to
          operate the service, keep accurate records, and comply with
          applicable legal and tax obligations.
        </p>
      </Section>

      <Section title="Your choices">
        <p style={styles.p}>
          If you're an advertiser and want your campaign's contact
          information corrected, updated, or removed after your campaign has
          ended, contact us and we'll assist.
        </p>
      </Section>

      <Section title="Changes">
        <p style={styles.p}>
          We may update this privacy policy as the service evolves. The
          version published on this page is the version currently
          applicable.
        </p>
      </Section>
    </PageShell>
  );
}

export function RefundPage({ onBack }) {
  return (
    <PageShell onBack={onBack}>
      <Section title="Our refund policy">
        <p style={styles.p}>
          Campaign payments are final once a campaign goes live and begins
          showing on the billboard. Campaigns run for the fixed duration you
          purchased (24 hours, 3 days, or 7 days) regardless of traffic or
          the number of interactions received — we do not offer refunds or
          extensions based on how much traffic a campaign gets, since no
          traffic level is promised or guaranteed.
        </p>
      </Section>

      <Section title="Before your campaign goes live">
        <p style={styles.p}>
          If you paid for a campaign but it has not yet gone live — for
          example if you haven't completed the campaign setup step, or your
          campaign is still waiting for a slot to become available — contact
          us and we'll review your request.
        </p>
      </Section>

      <Section title="Billing errors">
        <p style={styles.p}>
          If you believe you were charged in error (for example, a duplicate
          charge), contact us and we'll investigate and correct any billing
          mistake.
        </p>
      </Section>

      <Section title="How refunds are handled">
        <p style={styles.p}>
          Payments are processed by Dodo Payments, our Merchant of Record.
          Where a refund is approved, it is issued through Dodo Payments
          back to your original payment method, and may take several
          business days to appear depending on your bank or card provider.
        </p>
      </Section>

      <Section title="Contact us">
        <p style={styles.p}>
          For any refund request or billing question, reach out using the
          contact details on our About page and we'll get back to you.
        </p>
      </Section>
    </PageShell>
  );
}

