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
  primaryDeep: "#8A5D59",
  secondaryAccent: "#D8BDB8",
  secondaryTint: "#F6EDEB",
  text: "#4A4A4A",
  textSecondary: "#6E6663",
  textMuted: "#8A807C",
  textSubtle: "#A79E9A",
  borderStrong: "#D8C9BB",
  border: "#E4D8CC",
  divider: "#F2EBE2",
  success: "#7C9473",
  successText: "#5F7457",
  warning: "#C99A4E",
  warningText: "#9A7434",
  error: "#B25D4B",
  errorText: "#94493A",
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

export const radii = {
  control: 8,
  card: 12,
  frame: 16,
  pill: 999,
} as const;

export const typography = {
  display: 44,
  title: 30,
  titleSecondary: 22,
  price: 26,
  bodyLarge: 17,
  body: 15,
  label: 12,
  note: 13,
} as const;

export const shadows = {
  button: {
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  card: {
    elevation: 3,
    shadowColor: "#4A3A30",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
} as const;
