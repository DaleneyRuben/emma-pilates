import type { PromotionImageSourceDto } from "@pilates/api-contracts";

import { spacing } from "@pilates/mobile-core";

// The Screen pads 16 pt on each side; a tablet card stops at the 1440 px
// variant's 2× width so the image never upscales (UPL-002).
export const promotionCardMaxWidth = 720;

export function promotionCardWidth(windowWidth: number): number {
  return Math.min(windowWidth - spacing.lg * 2, promotionCardMaxWidth);
}

export function choosePromotionImageSource(
  sources: readonly PromotionImageSourceDto[],
  cardWidth: number,
  pixelRatio: number,
): PromotionImageSourceDto | undefined {
  const needed = cardWidth * pixelRatio;
  const byWidth = [...sources].sort((a, b) => a.width - b.width);
  return byWidth.find((source) => source.width >= needed) ?? byWidth.at(-1);
}
