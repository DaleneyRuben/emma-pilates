import { Glyph, type GlyphName } from "@pilates/mobile-core";

// 18's line icons for the Perfil rows, stroked in Palo de rosa (follow-up 70),
// drawn from the shared glyphs (MOB-042).
const glyphs = {
  plan: "clock",
  evaluation: "leaf",
  evaluations: "trend",
  referrals: "person",
  credit: "credit",
  notifications: "bell",
  password: "password",
} as const satisfies Record<string, GlyphName>;

export type ProfileRowIconName = keyof typeof glyphs;

export function ProfileRowIcon({ name }: { name: ProfileRowIconName }) {
  return <Glyph name={glyphs[name]} size={21} testID={`profile-row-icon-${name}`} />;
}
