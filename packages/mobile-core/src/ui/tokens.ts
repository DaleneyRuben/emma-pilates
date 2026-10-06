export const colors = {
  background: "#F2ECE5",
  surface: "#FAF7F2",
  white: "#FFFFFF",
  surfaceSubtle: "#FDFAF6",
  rowHover: "#FDF7F2",
  primary: "#B78380",
  primaryHover: "#A87370",
  primaryPressed: "#9C6764",
  primaryTint: "#EFE0DC",
  // The outcome badge's circle on a link that did not work (MOB-035).
  primaryWash: "rgba(183,131,128,0.14)",
  // Text on Palo de rosa tinte: badges, initials, and pending cards (follow-up 70).
  primaryOnTint: "#7A4F4B",
  primaryDeep: "#8A5D59",
  secondaryAccent: "#D8BDB8",
  secondaryTint: "#F6EDEB",
  text: "#4A4A4A",
  textSecondary: "#6E6663",
  textMuted: "#766D69",
  textSubtle: "#7A716D",
  borderStrong: "#D8C9BB",
  border: "#E4D8CC",
  divider: "#F2EBE2",
  // The rule under a screen's header in the mobile frames (MOB-038).
  rule: "#EFE7DE",
  success: "#7C9473",
  successText: "#5F7457",
  warning: "#C99A4E",
  warningText: "#9A7434",
  error: "#B25D4B",
  errorText: "#94493A",
  successTint: "rgba(124,148,115,0.14)",
  warningTint: "rgba(201,154,78,0.12)",
  // The rule between a pending card's notes (S06).
  warningRule: "rgba(201,154,78,0.28)",
  errorTint: "rgba(178,93,75,0.08)",
  // The dashed empty-state box on Superficie (S06 «Sin plan activo»).
  neutralTint: "rgba(216,201,187,0.14)",
  // The circle behind an empty panel's icon (S04's tablet split view).
  neutralWash: "rgba(216,201,187,0.18)",
  disabledBackground: "#E7DCD8",
  disabledText: "#B3A9A5",
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  smd: 6,
  sm: 8,
  smLg: 10,
  md: 12,
  mdLg: 14,
  lg: 16,
  lgXl: 18,
  xlSm: 20,
  xl: 24,
  xlLg: 26,
  xxl: 32,
  xxxl: 40,
} as const;

// The frames round cards at 16 (MOB-039); chips, tinted notices, insets,
// and sheets keep 12.
export const radii = {
  control: 8,
  inset: 12,
  card: 16,
  frame: 16,
  pill: 999,
} as const;

export const typography = {
  display: 44,
  title: 30,
  titleSecondary: 22,
  price: 26,
  titleSmall: 19,
  bodyLarge: 17,
  body: 15,
  label: 12,
  note: 13,
  tabLabel: 11,
} as const;

export const shadows = {
  button: {
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  // The frames' `0 2px 8px rgba(74,74,74,0.05)` under most cards (MOB-039).
  card: {
    elevation: 1,
    shadowColor: "#4A4A4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
} as const;

const cardBox = {
  backgroundColor: colors.white,
  borderColor: colors.borderStrong,
  borderRadius: radii.card,
  borderWidth: 1,
} as const;

/** The mobile frames' card: Blanco, 1 px Borde fuerte, radius 16 (MOB-039). */
export const surfaces = {
  card: { ...cardBox, ...shadows.card },
  // Cards the frames draw without the shadow: 12's dates, 17's origin, S03's
  // roster, S06's history, S12's receipt, S23's groups.
  flatCard: cardBox,
} as const;
