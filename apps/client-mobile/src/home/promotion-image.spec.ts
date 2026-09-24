import { choosePromotionImageSource, promotionCardWidth } from "./promotion-image";

const source = (width: number) => ({
  url: `https://images.example.com/promotion_${width}`,
  mediaType: "image/webp",
  width,
  height: Math.round((width * 9) / 16),
});

// The API answers the sources in no promised order.
const sources = [source(960), source(1440), source(480)];

describe("choosePromotionImageSource", () => {
  it("picks the narrowest source that covers the card at the device pixel ratio", () => {
    expect(choosePromotionImageSource(sources, 361, 1)?.width).toBe(480);
    expect(choosePromotionImageSource(sources, 361, 2)?.width).toBe(960);
    expect(choosePromotionImageSource(sources, 361, 3)?.width).toBe(1440);
  });

  it("falls back to the widest source when none covers the card", () => {
    expect(choosePromotionImageSource(sources, 720, 3)?.width).toBe(1440);
  });

  it("answers undefined without sources", () => {
    expect(choosePromotionImageSource([], 361, 3)).toBeUndefined();
  });
});

describe("promotionCardWidth", () => {
  it("fills the phone's content width and caps the tablet card", () => {
    expect(promotionCardWidth(393)).toBe(361);
    expect(promotionCardWidth(1024)).toBe(720);
  });
});
