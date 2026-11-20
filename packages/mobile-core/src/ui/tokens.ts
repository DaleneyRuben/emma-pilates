// Rosa Emma (follow-up 284, owner 2026-11-20): one scale of seven tones plus
// crema and white. Rosa profundo (600) is the darkest tone. Colour lives in
// large areas (screen 100, header band 200, solid 600 and 500 blocks); small
// text sits only on white, 50 or 600.
export const rosa = {
  50: "#FEF6F2",
  100: "#F9E7DF",
  200: "#E7CCBF",
  300: "#DAB9AB",
  400: "#CDA697",
  500: "#B78380",
  600: "#93615D",
} as const;

export const brand = {
  rubor: rosa[200],
  arcilla: rosa[400],
  paloDeRosa: rosa[500],
  rosaProfundo: rosa[600],
  crema: "#F9F4F2",
  white: "#FFFBFB",
} as const;

const white = brand.white;
const ink = rosa[600];

// Token names predate Rosa Emma; each keeps its role so every screen picks the
// new look up.
export const colors = {
  // The screen and the header band.
  background: rosa[100],
  surface: rosa[100],
  band: rosa[200],
  // Cards, sheets, inputs and the tab bar.
  white,
  card: white,
  // The screen's one strong block: 600 with white text.
  emphasis: ink,
  onEmphasis: white,
  // Secondary blocks: 500 with large white text only.
  medio: rosa[500],
  onMedio: white,
  // Dividers between the rows inside a white card.
  hairline: rosa[100],
  surfaceSubtle: rosa[50],
  rowHover: rosa[50],
  // The primary button and the selected chip or tab: 600 with white labels.
  primary: ink,
  onPrimary: white,
  primaryHover: rosa[500],
  primaryPressed: rosa[500],
  // Soft insets on white: exception pills, notices, the class time box.
  primaryTint: rosa[50],
  primaryWash: rosa[50],
  primaryOnTint: ink,
  primaryDeep: ink,
  // Initials circles.
  secondaryAccent: ink,
  secondaryTint: rosa[50],
  text: ink,
  textSecondary: ink,
  textMuted: ink,
  textSubtle: ink,
  // Outlines (inputs, outlined chips) and the soft inset's 1px rule.
  borderStrong: rosa[400],
  border: rosa[400],
  borderSoft: rosa[200],
  divider: rosa[100],
  rule: rosa[200],
  // States are said with words and weight, never with green, amber or red.
  success: ink,
  successText: ink,
  warning: ink,
  warningText: ink,
  error: ink,
  errorText: ink,
  errorSurface: rosa[50],
  errorDisabledBorder: rosa[400],
  errorDisabledText: ink,
  warningTitle: ink,
  warningBody: ink,
  successTint: rosa[50],
  warningTint: rosa[50],
  warningRule: rosa[400],
  errorTint: rosa[50],
  errorPill: rosa[50],
  neutralTint: rosa[50],
  neutralWash: rosa[50],
  neutralPill: rosa[50],
  accentTint: rosa[50],
  accentWash: rosa[50],
  inkTint: rosa[50],
  // Disabled: 50 with a 400 outline, always with a reason line.
  disabledBackground: rosa[50],
  disabledText: ink,
  iconQuiet: ink,
  // Class-type bars.
  typeReformer: ink,
  typeMat: rosa[300],
  typeCadillac: rosa[500],
  typeOther: rosa[400],
  scrim: "rgba(147,97,93,0.42)",
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

export const radii = {
  button: 16,
  control: 8,
  inset: 14,
  card: 20,
  frame: 20,
  hero: 24,
  // The header band's lower corners and a sheet's upper corners.
  band: 28,
  pill: 999,
} as const;

const cardShadow = "0 1px 2px rgba(147,97,93,0.08), 0 4px 14px rgba(147,97,93,0.10)";

export const shadows = {
  button: { boxShadow: "0 1px 2px rgba(147,97,93,0.06), 0 2px 8px rgba(147,97,93,0.06)" },
  card: { boxShadow: cardShadow },
  hero: { boxShadow: "0 10px 28px rgba(147,97,93,0.30)" },
  // A fixed footer or the tab bar: the card shadow, cast upward.
  footer: { boxShadow: "0 -1px 2px rgba(147,97,93,0.08), 0 -4px 14px rgba(147,97,93,0.10)" },
  sheet: { boxShadow: "0 -12px 32px rgba(147,97,93,0.25)" },
  // The tab bar's 1 pt 200 rule on top.
  tabBar: { boxShadow: "0 -1px 0 #E7CCBF" },
  toast: { boxShadow: "0 10px 28px rgba(147,97,93,0.35)" },
} as const;

const cardBox = {
  backgroundColor: colors.card,
  borderRadius: radii.card,
  boxShadow: cardShadow,
} as const;

/** White cards with a soft rosa shadow; the screen's one hero block is 600,
 * radius 24, with white text; the medio block is 500 with large white text. */
export const surfaces = {
  card: cardBox,
  flatCard: cardBox,
  emphasis: { backgroundColor: colors.emphasis, borderRadius: radii.hero, ...shadows.hero },
  medio: { backgroundColor: colors.medio, borderRadius: radii.card },
  // A soft inset on white: 50 with a 1px 200 rule.
  soft: {
    backgroundColor: rosa[50],
    borderColor: rosa[200],
    borderRadius: 16,
    borderWidth: 1,
  },
} as const;
