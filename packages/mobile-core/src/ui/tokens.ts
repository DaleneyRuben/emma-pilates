// FIX-089 (palette B, owner 2026-11-19): every screen uses only these five
// colours. Text is always Rosa profundo; hierarchy comes from size and weight.
export const brand = {
  rubor: "#E7CCBF",
  arcilla: "#CDA697",
  paloDeRosa: "#B78380",
  rosaProfundo: "#93615D",
  crema: "#F9F4F2",
} as const;

const { rubor, arcilla, paloDeRosa, rosaProfundo, crema } = brand;

// Token names predate palette B; each keeps its role and takes one of the five
// colours so every screen picks the palette up.
export const colors = {
  background: crema,
  surface: crema,
  white: crema,
  card: crema,
  // The hero block: Palo de rosa with large Crema text only.
  emphasis: paloDeRosa,
  onEmphasis: crema,
  // Dividers between rows of a group.
  hairline: rubor,
  surfaceSubtle: crema,
  rowHover: rubor,
  // The primary button and the selected chip: Rosa profundo with Crema labels.
  primary: rosaProfundo,
  onPrimary: crema,
  primaryHover: paloDeRosa,
  primaryPressed: paloDeRosa,
  // Soft backgrounds: exception pills, the form summary, the class time box.
  primaryTint: rubor,
  primaryWash: rubor,
  primaryOnTint: rosaProfundo,
  primaryDeep: rosaProfundo,
  // Initials circles.
  secondaryAccent: paloDeRosa,
  secondaryTint: rubor,
  text: rosaProfundo,
  textSecondary: rosaProfundo,
  textMuted: rosaProfundo,
  textSubtle: rosaProfundo,
  borderStrong: arcilla,
  border: arcilla,
  divider: rubor,
  rule: rubor,
  // States are said with words and weight, never with green, amber or red.
  success: rosaProfundo,
  successText: rosaProfundo,
  warning: rosaProfundo,
  warningText: rosaProfundo,
  error: rosaProfundo,
  errorText: rosaProfundo,
  errorSurface: rubor,
  errorDisabledBorder: arcilla,
  errorDisabledText: rosaProfundo,
  warningTitle: rosaProfundo,
  warningBody: rosaProfundo,
  successTint: rubor,
  warningTint: rubor,
  warningRule: arcilla,
  errorTint: rubor,
  errorPill: rubor,
  neutralTint: crema,
  neutralWash: crema,
  neutralPill: rubor,
  accentTint: rubor,
  accentWash: rubor,
  inkTint: crema,
  // Disabled: Crema with an Arcilla border, always with a reason line.
  disabledBackground: crema,
  disabledText: rosaProfundo,
  // Quiet icons (chevrons, empty-state glyphs) meet 3:1 on Crema.
  iconQuiet: paloDeRosa,
  scrim: "rgba(147,97,93,0.35)",
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

// Cards round at 16 on every surface (web too, FIX-089); the hero at 18;
// chips, notices, insets and sheets keep 12.
export const radii = {
  // FIX-089: primary and secondary buttons round at 12.
  button: 12,
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

// FIX-089: flat surfaces. Cards carry a 1px Arcilla border instead of a shadow.
const noShadow = {
  elevation: 0,
  shadowColor: rosaProfundo,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
} as const;

export const shadows = {
  button: noShadow,
  card: noShadow,
} as const;

const cardBox = {
  backgroundColor: colors.card,
  borderColor: colors.border,
  borderRadius: radii.card,
  borderWidth: 1,
} as const;

/** Cards are Crema with a 1px Arcilla border; the screen's one hero block is
 * Palo de rosa, radius 18, with large Crema text. */
export const surfaces = {
  card: cardBox,
  flatCard: cardBox,
  emphasis: { backgroundColor: colors.emphasis, borderRadius: 18 },
} as const;
