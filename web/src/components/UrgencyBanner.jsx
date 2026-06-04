/**
 * UrgencyBanner.jsx
 * Drop this near the top of your App.jsx or layout component,
 * above the hero section but below any top nav.
 *
 * Dismissible via sessionStorage so repeat visitors within the
 * same session aren't interrupted, but it reappears on each new visit.
 *
 * Usage:
 *   import UrgencyBanner from './components/UrgencyBanner';
 *   <UrgencyBanner />
 */

import { useState, useEffect } from "react";

const STORAGE_KEY = "hopkins_banner_dismissed_v2";

export default function UrgencyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={styles.wrapper} role="alert" aria-live="polite">
      <div style={styles.inner}>

        {/* Left: urgency indicator */}
        <div style={styles.urgencyBadge}>
          <span style={styles.urgencyLabel}>ACT</span>
          <span style={styles.urgencyIcon}>!</span>
          <span style={styles.urgencyLabel}>NOW</span>
        </div>

        {/* Center: message */}
        <div style={styles.content}>
          <p style={styles.headline}>
            A repaving decision could lock out bike lanes on Hopkins until 2031.
          </p>
          <p style={styles.body}>
            The Infrastructure Committee has recommended repaving Hopkins without
            the protected bike lane already approved in 2022. Berkeley's
            five-year paving moratorium means a decision to pave without the
            lane would shelve safety improvements for at least five years.
            City Council decides — and the budget vote is imminent.
          </p>
          <div style={styles.actions}>
            <a
              href="https://actionnetwork.org/letters/safe-hopkins-street"
              style={styles.btnPrimary}
              target="_blank"
              rel="noopener noreferrer"
            >
              Tell Council to keep the safety plan
            </a>
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          style={styles.closeBtn}
          aria-label="Dismiss this alert"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
// Inline so the component is truly drop-in with zero CSS dependencies.
// Colors match the project's warm dark palette.

const styles = {
  wrapper: {
    background: "linear-gradient(135deg, #2a1f0f 0%, #1e1a14 100%)",
    borderBottom: "2px solid #c4713b",
    padding: "0",
    position: "relative",
    zIndex: 50,
  },
  inner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "1rem 1.5rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "1.25rem",
  },

  // Urgency badge
  urgencyBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#c4713b",
    borderRadius: "4px",
    padding: "0.5rem 0.75rem",
    minWidth: "52px",
    flexShrink: 0,
  },
  urgencyLabel: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: "0.55rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#1a1a18",
    textTransform: "uppercase",
    lineHeight: 1,
  },
  urgencyIcon: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1a1a18",
    lineHeight: 1,
    margin: "0.1rem 0",
  },

  // Content
  content: {
    flex: 1,
  },
  headline: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: "1.05rem",
    color: "#e8e4db",
    margin: "0 0 0.35rem 0",
    lineHeight: 1.25,
  },
  body: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: "0.85rem",
    color: "#b8b0a4",
    margin: "0 0 0.75rem 0",
    lineHeight: 1.55,
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
    alignItems: "center",
  },
  btnPrimary: {
    display: "inline-block",
    background: "#c4713b",
    color: "#1a1a18",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
    padding: "0.45rem 1rem",
    borderRadius: "2px",
    textDecoration: "none",
    transition: "opacity 0.15s ease",
  },
  btnSecondary: {
    display: "inline-block",
    color: "#c4713b",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: "0.8rem",
    fontWeight: 600,
    letterSpacing: "0.03em",
    textDecoration: "none",
    borderBottom: "1px solid rgba(196,113,59,0.4)",
    paddingBottom: "1px",
    transition: "opacity 0.15s ease",
  },

  // Dismiss
  closeBtn: {
    background: "none",
    border: "none",
    color: "#7a6b5d",
    fontSize: "0.9rem",
    cursor: "pointer",
    padding: "0.25rem",
    flexShrink: 0,
    alignSelf: "flex-start",
    lineHeight: 1,
    transition: "color 0.15s ease",
  },
};
