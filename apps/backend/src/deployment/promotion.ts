// Stub until EXT-017's promotion rules are implemented.
export type CommitComparison = 'ahead' | 'behind' | 'identical' | 'diverged';

export type PromotionSources = {
  stagingRelease(): Promise<string | null>;
  productionRelease(): Promise<string | null>;
  stagingCheck(sha: string): Promise<string | null>;
  compare(from: string, to: string): Promise<CommitComparison>;
};

export type Promotion =
  { outcome: 'promote'; sha: string } | { outcome: 'refused'; detail: string };

export function choosePromotion(
  requested: string | null,
  sources: PromotionSources,
): Promise<Promotion> {
  void requested;
  void sources;
  return Promise.resolve({ outcome: 'refused', detail: 'not implemented' });
}
