import type { AdminPromotionContactDto } from "@pilates/api-contracts";

// Red stubs: BE-022 builds the export next.
export const promotionContactsCsv = (
  contacts: readonly AdminPromotionContactDto[],
): string => `${contacts.length}`;

export const contactsCsvName = (now: Date): string => now.toISOString();
