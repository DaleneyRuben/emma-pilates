export type CommitComparison = 'ahead' | 'behind' | 'identical' | 'diverged';

export type PromotionSources = {
  // The commit /health/ready reports, null when it reports none.
  stagingRelease(): Promise<string | null>;
  productionRelease(): Promise<string | null>;
  // The commit's latest `release/staging` status, null when it has none.
  stagingCheck(sha: string): Promise<string | null>;
  // How `to` relates to `from` in the repository's history.
  compare(from: string, to: string): Promise<CommitComparison>;
};

export type Promotion =
  { outcome: 'promote'; sha: string } | { outcome: 'refused'; detail: string };

const fullHash = /^[0-9a-f]{40}$/;

// EXT-017 (ADR-0092): production takes only a commit that passed staging's
// smoke check, and never one behind or beside what it already runs.
export async function choosePromotion(
  requested: string | null,
  sources: PromotionSources,
): Promise<Promotion> {
  const sha = requested ?? (await sources.stagingRelease());
  if (sha === null) {
    return {
      outcome: 'refused',
      detail: 'staging reports no release; name the commit to promote',
    };
  }
  if (!fullHash.test(sha)) {
    return { outcome: 'refused', detail: `${sha} is not a full commit hash` };
  }

  const check = await sources.stagingCheck(sha);
  if (check !== 'success') {
    return {
      outcome: 'refused',
      detail: `${sha} did not pass staging (release/staging is ${check ?? 'missing'})`,
    };
  }

  const running = await sources.productionRelease();
  if (running !== null && running !== sha) {
    const comparison = await sources.compare(running, sha);
    if (comparison === 'behind' || comparison === 'diverged') {
      const relation = comparison === 'behind' ? 'behind' : 'diverged from';
      return {
        outcome: 'refused',
        detail: `${sha} is ${relation} production's ${running}; a promotion never rolls production back`,
      };
    }
  }
  return { outcome: 'promote', sha };
}
