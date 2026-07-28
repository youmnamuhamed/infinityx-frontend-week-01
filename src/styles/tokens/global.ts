/**
 * IX-Design — Global Tokens
 * -----------------------------------------------------------------------
 * Tier 1 of the token architecture: raw, context-free primitive values.
 *
 * Rules:
 *  - No semantic meaning lives here (no "surface", "primary", "danger").
 *  - Nothing in this file should reference a theme, a component, or a
 *    use-case. It is purely a palette + scale library.
 *  - Semantic tokens (tier 2) will map onto these values per-theme.
 *
 * The blue scale is anchored so that `blue.500` equals the existing
 * Infinity X accent color (#3b82f6), keeping today's dark theme a
 * lossless subset of this system rather than a redesign.
 */

export const colors = {
  slate: {
    50: "#f8fafc",
    100: "#eef1f5",
    200: "#dfe3ea",
    300: "#c3c9d4",
    400: "#9aa3b2",
    500: "#717a8a",
    600: "#545c6b",
    700: "#3d4351",
    800: "#262b36",
    900: "#171c26",
    950: "#0a0d12",
  },

  blue: {
    50: "#eef4ff",
    100: "#dbe6fe",
    200: "#bcd0fd",
    300: "#8fb2fb",
    400: "#5b93f7",
    500: "#3b82f6", // = existing --ix-accent
    600: "#2f6bd6",
    700: "#2757ad",
    800: "#20458a",
    900: "#1c3a70",
    950: "#142748",
  },

  green: {
    50: "#eefdf3",
    100: "#d6fae2",
    200: "#aef2c8",
    300: "#75e5a5",
    400: "#3fd17f",
    500: "#22c55e", // = existing --ix-success
    600: "#189a49",
    700: "#15773a",
    800: "#145e30",
    900: "#124d2a",
    950: "#052b15",
  },

  amber: {
    50: "#fffbea",
    100: "#fff3c4",
    200: "#fce588",
    300: "#fbd24b",
    400: "#f9c020",
    500: "#f59e0b", // = existing --ix-warning
    600: "#d17e07",
    700: "#a8600a",
    800: "#884b10",
    900: "#713e11",
    950: "#411f05",
  },

  red: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444", // = existing --ix-danger
    600: "#dc2626",
    700: "#b91c1c",
    800: "#941616",
    900: "#7a1616",
    950: "#420a0a",
  },

  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
} as const;

/**
 * Base spacing unit is 4px. Keys map to multiples of that unit, matching
 * Tailwind's convention so semantic/component tokens compose predictably
 * with utility classes.
 */
export const spacing = {
  0: "0px",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

export const radii = {
  none: "0px",
  sm: "4px",
  md: "8px", // = existing --ix-radius
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const fontSizes = {
  xs: "11px",
  sm: "12px",
  base: "13px",
  md: "14px",
  lg: "15px",
  xl: "18px",
  "2xl": "24px",
  "3xl": "32px",
} as const;

export const fontWeights = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeights = {
  tight: "1.2",
  snug: "1.35",
  normal: "1.5",
  relaxed: "1.65",
} as const;

export const letterSpacing = {
  tight: "-0.01em",
  normal: "0em",
  wide: "0.04em",
  wider: "0.06em",
} as const;

/**
 * Two-layer shadows by default (ambient + key light), matching the
 * existing dropdown/menu shadow convention already in use.
 */
export const shadows = {
  none: "none",
  sm: "0 1px 2px rgba(0, 0, 0, 0.24)",
  md: "0 4px 12px rgba(0, 0, 0, 0.32)",
  lg: "0 8px 24px rgba(0, 0, 0, 0.4)", // = existing workspace-switcher shadow
  xl: "0 16px 40px rgba(0, 0, 0, 0.48)",
  focusRing: "0 0 0 2px var(--ix-focus-ring, #3b82f6)",
} as const;

export const borderWidths = {
  0: "0px",
  hairline: "1px",
  thick: "2px",
} as const;

/**
 * Formalizes the ad hoc z-index values already scattered in globals.css
 * (header: 10, drawer: 40, backdrop: 35, dropdown: 50) into a named scale.
 */
export const zIndices = {
  base: 0,
  header: 10,
  drawer: 40,
  drawerBackdrop: 35,
  dropdown: 50,
  overlay: 60,
  modal: 70,
  popover: 80,
  toast: 90,
  tooltip: 100,
} as const;

export const durations = {
  instant: "0ms",
  fast: "120ms",
  base: "200ms",
  slow: "300ms",
  slower: "480ms",
} as const;

export const easings = {
  standard: "ease",
  decelerate: "cubic-bezier(0, 0, 0.2, 1)",
  accelerate: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

export const globalTokens = {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  shadows,
  borderWidths,
  zIndices,
  durations,
  easings,
} as const;

export type GlobalTokens = typeof globalTokens;
export type ColorScale = keyof typeof colors;
export type ColorStep = keyof typeof colors.blue;

export default globalTokens;
