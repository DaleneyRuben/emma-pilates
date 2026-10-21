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
  // 24's destructive button while it cannot be pressed (MOB-066).
  errorDisabledBorder: "#E7CFC8",
  errorDisabledText: "#D4A99F",
  // 24's pending-payment notice on Advertencia tint (MOB-066).
  warningTitle: "#7C5D2A",
  warningBody: "#6E5A36",
  successTint: "rgba(124,148,115,0.14)",
  warningTint: "rgba(201,154,78,0.12)",
  // The rule between a pending card's notes (S06).
  warningRule: "rgba(201,154,78,0.28)",
  errorTint: "rgba(178,93,75,0.08)",
  // The Error status pill, such as S06's «Vencida» (MOB-066).
  errorPill: "rgba(178,93,75,0.12)",
  // The dashed empty-state box on Superficie (S06 «Sin plan activo»).
  neutralTint: "rgba(216,201,187,0.14)",
  // The circle behind an empty panel's icon (S04's tablet split view).
  neutralWash: "rgba(216,201,187,0.18)",
  // S02's «Con cupos» pill (MOB-042).
  neutralPill: "rgba(216,201,187,0.34)",
  // Tints of the accent `#D8BDB8`: 02's shortcut tile and 03's seat pill
  // (0.28), the S04 and S11 avatars (0.4) (MOB-042).
  accentTint: "rgba(216,189,184,0.28)",
  accentWash: "rgba(216,189,184,0.4)",
  // The tile of 02's disabled shortcut: Plomo cálido at low alpha (MOB-042).
  inkTint: "rgba(74,74,74,0.05)",
  disabledBackground: "#E7DCD8",
  disabledText: "#B3A9A5",
  // The frames' quiet icon: the 34 pt empty-state glyphs of 07, 19, S20,
  // S21, and S22 and the row chevrons of 02, 18, and S23 (MOB-040).
  iconQuiet: "#C4BAB6",
  // The design system's scrim behind sheets and modals (MOB-066).
  scrim: "rgba(74,58,48,0.22)",
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
  // The Lora titles of the S02 and S13 cards and the Lora 19 of 03, S07, S11, and S15 (MOB-042).
  titleCard: 20,
  titleSmall: 19,
  bodyLarge: 17,
  // The names on S04's results, S15's rows, and 02's tiles (MOB-042).
  bodyMedium: 16,
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
