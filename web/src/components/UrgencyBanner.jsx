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

const STORAGE_KEY = "hopkins_banner_dismissed";
const MEETING_DATE = new Date("2026-04-15T14:00:00-07:00"); // 2pm PDT

function getDaysUntil(target) {
  const now = new Date();
  const diff = target - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function UrgencyBanner() {
  const [visible, setVisible] = useState(false);
  const daysLeft = getDaysUntil(MEETING_DATE);
  const meetingPassed = daysLeft === 0;

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

        {/* Left: date badge */}
        <div style={styles.dateBadge}>
          <span style={styles.dateDay}>APR</span>
          <span style={styles.dateNum}>15</span>
          {!meetingPassed && (
            <span style={styles.dateDays}>
              {daysLeft === 1 ? "TOMORROW" : `${daysLeft} DAYS`}
            </span>
          )}
        </div>

        {/* Center: message */}
        <div style={styles.content}>
          <p style={styles.headline}>
            {meetingPassed
              ? "The FITES Committee has voted — the fight isn't over."
              : "A committee vote could strip the safety plan from Hopkins Street."}
          </p>
          <p style={styles.body}>
            {meetingPassed
              ? "The Infrastructure Committee made its recommendation. City Council still decides. The data case for safe streets on Hopkins is as strong as ever."
              : "On April 15 at 2 pm, Berkeley's Infrastructure Committee will consider a proposal to repave Hopkins without the bike lanes and pedestrian improvements Council already approved in 2022. Tell them the data doesn't support that choice."}
          </p>

          {!meetingPassed && (
            <div style={styles.actions}>
              <a
                href="https://actionnetwork.org/letters/make-hopkins-safe-for-all"
                style={styles.btnPrimary}
                target="_blank"
                rel="noopener noreferrer"
              >
                Email the Committee
              </a>
              <a
                href="https://cityofberkeley-info.zoomgov.com/j/1617583394"
                style={styles.btnSecondary}
                target="_blank"
                rel="noopener noreferrer"
              >
                Join April 15 Meeting →
              </a>
            </div>
          )}
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

  // Date badge
  dateBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#c4713b",
    borderRadius: "4px",
    padding: "0.5rem 0.75rem",
    minWidth: "56px",
    flexShrink: 0,
  },
  dateDay: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: "0.6rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "#1a1a18",
    textTransform: "uppercase",
    lineHeight: 1,
  },
  dateNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "1.75rem",
    fontWeight: 600,
    color: "#1a1a18",
    lineHeight: 1,
  },
  dateDays: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: "0.55rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#1a1a18",
    textTransform: "uppercase",
    marginTop: "0.2rem",
    lineHeight: 1,
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
