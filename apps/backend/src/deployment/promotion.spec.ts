import { choosePromotion, type PromotionSources } from './promotion';

const staged = 'd9ff2e02ec0db4d23d4bceb7eca59730f96f48e9';
const running = '87fe95d2a1b3c4d5e6f708192a3b4c5d6e7f8091';

function sources(overrides: Partial<PromotionSources> = {}) {
  const checked: string[] = [];
  const compared: string[] = [];
  const base: PromotionSources = {
    stagingRelease: () => Promise.resolve(staged),
    productionRelease: () => Promise.resolve(running),
    stagingCheck: (sha) => {
      checked.push(sha);
      return Promise.resolve('success');
    },
    compare: (from, to) => {
      compared.push(`${from}...${to}`);
      return Promise.resolve('ahead');
    },
  };
  return { sources: { ...base, ...overrides }, checked, compared };
}

describe('choosePromotion (EXT-017)', () => {
  it('promotes the commit staging runs by default', async () => {
    const { sources: input, checked, compared } = sources();

    await expect(choosePromotion(null, input)).resolves.toEqual({
      outcome: 'promote',
      sha: staged,
    });
    expect(checked).toEqual([staged]);
    expect(compared).toEqual([`${running}...${staged}`]);
  });

  it('promotes a requested commit that passed staging', async () => {
    const requested = 'a'.repeat(40);
    const { sources: input, checked } = sources();

    await expect(choosePromotion(requested, input)).resolves.toEqual({
      outcome: 'promote',
      sha: requested,
    });
    expect(checked).toEqual([requested]);
  });

  it('refuses a commit whose staging smoke check did not pass', async () => {
    const { sources: input } = sources({
      stagingCheck: () => Promise.resolve('failure'),
    });

    await expect(choosePromotion(null, input)).resolves.toEqual({
      outcome: 'refused',
      detail: `${staged} did not pass staging (release/staging is failure)`,
    });
  });

  it('refuses a commit staging never released', async () => {
    const { sources: input } = sources({
      stagingCheck: () => Promise.resolve(null),
    });

    await expect(choosePromotion(null, input)).resolves.toEqual({
      outcome: 'refused',
      detail: `${staged} did not pass staging (release/staging is missing)`,
    });
  });

  it('refuses a commit behind what production runs', async () => {
    const { sources: input } = sources({
      compare: () => Promise.resolve('behind'),
    });

    await expect(choosePromotion(null, input)).resolves.toEqual({
      outcome: 'refused',
      detail: `${staged} is behind production's ${running}; a promotion never rolls production back`,
    });
  });

  it('refuses a commit beside what production runs', async () => {
    const { sources: input } = sources({
      compare: () => Promise.resolve('diverged'),
    });

    await expect(choosePromotion(null, input)).resolves.toEqual({
      outcome: 'refused',
      detail: `${staged} is diverged from production's ${running}; a promotion never rolls production back`,
    });
  });

  it('promotes the commit production already runs again', async () => {
    const { sources: input, compared } = sources({
      productionRelease: () => Promise.resolve(staged),
    });

    await expect(choosePromotion(null, input)).resolves.toEqual({
      outcome: 'promote',
      sha: staged,
    });
    expect(compared).toEqual([]);
  });

  it('skips the history check when production reports no commit', async () => {
    const { sources: input, compared } = sources({
      productionRelease: () => Promise.resolve(null),
    });

    await expect(choosePromotion(null, input)).resolves.toEqual({
      outcome: 'promote',
      sha: staged,
    });
    expect(compared).toEqual([]);
  });

  it('refuses when staging reports no commit and none is requested', async () => {
    const { sources: input } = sources({
      stagingRelease: () => Promise.resolve(null),
    });

    await expect(choosePromotion(null, input)).resolves.toEqual({
      outcome: 'refused',
      detail: 'staging reports no release; name the commit to promote',
    });
  });

  it('refuses a commit that is not a full hash', async () => {
    const { sources: input, checked } = sources();

    await expect(choosePromotion('d9ff2e0', input)).resolves.toEqual({
      outcome: 'refused',
      detail: 'd9ff2e0 is not a full commit hash',
    });
    expect(checked).toEqual([]);
  });
});
