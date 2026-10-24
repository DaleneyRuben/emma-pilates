import type { ClientAcquisitionDtoChannel } from "@pilates/api-contracts";

// BKM-011: the eight answers to «¿Cómo nos conociste?», as the apps word
// them, and `unknown` for a Client registered before the question.
export const channelLabels: Record<ClientAcquisitionDtoChannel, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  google: "Google",
  friend: "Recomendación de una amiga",
  trainer: "Una instructora",
  walk_in: "Pasé por el estudio",
  other: "Otro",
  unknown: "Sin dato",
};

export const declaredChannels = [
  "instagram",
  "tiktok",
  "facebook",
  "google",
  "friend",
  "trainer",
  "walk_in",
  "other",
] as const;

export type DeclaredChannel = (typeof declaredChannels)[number];
