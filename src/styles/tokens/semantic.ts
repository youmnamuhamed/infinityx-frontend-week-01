/**
 * IX-Design — Semantic Tokens
 * -----------------------------------------------------------------------
 * Tier 2 of the token architecture: contextual mappings onto tier-1
 * global tokens. Every theme below satisfies the exact same
 * `SemanticTokens` shape — component code should NEVER read a global
 * token or a hex value directly; it reads `bg.surface`, `text.primary`,
 * `accent.solidBg`, etc., and the active theme resolves the value.
 *
 * Contrast targets:
 *  - `light` and `dark` are tuned to WCAG 2.1 AA  (4.5:1 normal text,
 *    3:1 large text / UI components).
 *  - `highContrast` is tuned to WCAG 2.1 AAA (7:1 normal text) for
 *    low-vision users, per the task's accessibility requirement.
 *
 * Two accent tokens are split deliberately — this is not stylistic:
 *  - `accent.default`  → accent used AS TEXT/ICON on a bg.* surface.
 *  - `accent.solidBg`  → accent used AS A BACKGROUND under text.onAccent
 *    (buttons, active nav states, filled badges).
 *  A single accent value cannot satisfy AA in both roles simultaneously
 *  (verified below) — this is what the existing `--ix-accent` gets
 *  wrong today when reused as both link color and button/active-state
 *  fill with white text.
 *
 * Ratios noted in comments are calculated via the WCAG relative
 * luminance formula (approximate, to 2 decimal places) — treat them as
 * design rationale, not a substitute for the automated contrast audit
 * (Step 9 bonus deliverable).
 */

import { colors, radii } from "./global";

// ---------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------

export interface SemanticTokens {
  bg: {
    canvas: string; // page background
    surface: string; // cards, panels, sidebar
    surfaceRaised: string; // dropdowns, popovers, raised panels
  };
  border: {
    default: string;
    subtle: string;
  };
  text: {
    primary: string;
    secondary: string;
    /** Large text (≥18px, or ≥14px bold) or icon-adjacent use only. */
    muted: string;
    /** Foreground color for text placed on top of accent.solidBg. */
    onAccent: string;
  };
  accent: {
    /** Accent used as text/icon color directly on a bg.* surface. */
    default: string;
    hover: string;
    /** Tinted background for subtle accent surfaces (e.g. selected row). */
    subtle: string;
    /** Accent used as a filled background under text.onAccent. */
    solidBg: string;
  };
  status: {
    success: string;
    warning: string;
    danger: string;
  };
  /** Outline color for :focus-visible states. */
  focusRing: string;
}

// ---------------------------------------------------------------------
// Dark theme — matches the existing production --ix-* values exactly,
// except the two corrected tokens noted above.
// ---------------------------------------------------------------------

export const darkTheme: SemanticTokens = {
  bg: {
    canvas: colors.slate[950], // #0a0d12 — was --ix-bg
    surface: "#0f1319", // was --ix-surface (between slate.950/900)
    surfaceRaised: "#131822", // was --ix-surface-raised
  },
  border: {
    default: "#1f2531", // was --ix-border
    subtle: colors.slate[900], // #171c26 — was --ix-border-subtle
  },
  text: {
    primary: "#e8eaed", // was --ix-text-primary
    secondary: colors.slate[400], // #9aa3b2 — was --ix-text-secondary
    muted: colors.slate[500], // #717a8a — FIXED (was #626b7a, ~3.6:1, failed AA)
    onAccent: colors.white,
  },
  accent: {
    default: colors.blue[500], // #3b82f6 — ~5.3:1 vs bg.canvas as text ✓ AA
    hover: colors.blue[400], // #5b93f7 — was --ix-accent-hover
    subtle: colors.blue[950], // #142748 — tinted surface, e.g. selected row
    solidBg: colors.blue[700], // #2757ad — ~6.9:1 with white text ✓ AA (NEW)
  },
  status: {
    success: colors.green[500], // was --ix-success
    warning: colors.amber[500], // was --ix-warning
    danger: colors.red[500], // was --ix-danger
  },
  focusRing: colors.blue[500],
};

// ---------------------------------------------------------------------
// Light theme — fresh palette built from the same scales.
// ---------------------------------------------------------------------

export const lightTheme: SemanticTokens = {
  bg: {
    canvas: colors.slate[50], // #f8fafc
    surface: colors.white,
    surfaceRaised: colors.slate[100], // #eef1f5
  },
  border: {
    default: colors.slate[200], // #dfe3ea
    subtle: colors.slate[100], // #eef1f5
  },
  text: {
    primary: colors.slate[900], // #171c26
    secondary: colors.slate[600], // #545c6b — ~6.7:1 vs white ✓ AA
    muted: colors.slate[500], // #717a8a — ~4.3:1, large text/icon use only
    onAccent: colors.white,
  },
  accent: {
    default: colors.blue[700], // #2757ad — ~6.9:1 vs white as text ✓ AA
    hover: colors.blue[800], // #20458a
    subtle: colors.blue[50], // #eef4ff
    solidBg: colors.blue[700], // #2757ad — ~6.9:1 with white text ✓ AA
  },
  status: {
    success: colors.green[700],
    warning: colors.amber[800], // amber is high-luminance; needs a dark step on light bg
    danger: colors.red[600],
  },
  focusRing: colors.blue[700],
};

// ---------------------------------------------------------------------
// High-contrast theme — WCAG AAA (7:1). Pure black/white extremes with
// accent tones chosen specifically per role (see header comment).
// ---------------------------------------------------------------------

export const highContrastTheme: SemanticTokens = {
  bg: {
    canvas: colors.black,
    surface: "#0a0a0a",
    surfaceRaised: "#141414",
  },
  border: {
    default: colors.white, // solid borders carry structure instead of subtle bg shifts
    subtle: colors.slate[300], // #c3c9d4 — still ~3:1+ non-text contrast vs black
  },
  text: {
    primary: colors.white,
    secondary: colors.slate[100], // #eef1f5 — ~15:1 vs black
    muted: colors.slate[200], // #dfe3ea — ~16.3:1 vs black ✓ AAA (no low-contrast "muted" here)
    onAccent: colors.white,
  },
  accent: {
    default: colors.blue[300], // #8fb2fb — ~9.9:1 vs black as text ✓ AAA
    hover: colors.blue[200], // #bcd0fd — even brighter
    subtle: colors.blue[950], // #142748
    solidBg: colors.blue[900], // #1c3a70 — ~11.1:1 with white text ✓ AAA
  },
  status: {
    success: colors.green[300], // #75e5a5 — bright, for AAA text-on-black
    warning: colors.amber[300], // #fbd24b
    danger: colors.red[300], // #fca5a5
  },
  focusRing: colors.white, // max-visibility ring, since AAA users rely on it most
};

// ---------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------

export type ThemeName = "light" | "dark" | "high-contrast";

export const semanticThemes: Record<ThemeName, SemanticTokens> = {
  light: lightTheme,
  dark: darkTheme,
  "high-contrast": highContrastTheme,
};

/**
 * Layout tokens are theme-invariant (dimensions don't change when the
 * color scheme does) — carried over as-is from the existing globals.css.
 */
export const layoutTokens = {
  radius: radii.md, // 8px — was --ix-radius
  sidebarWidthExpanded: "260px",
  sidebarWidthCollapsed: "72px",
  headerHeight: "64px",
} as const;

export default semanticThemes;
