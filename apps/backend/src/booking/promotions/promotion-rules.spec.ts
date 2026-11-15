import {
  orderedPromotionIds,
  PromotionError,
  promotionState,
  requirePromotionValues,
  requirePublishableWindow,
} from './promotion-rules';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const published = {
  publishedAt: new Date('2026-09-20T15:00:00.000Z'),
  archivedAt: null,
  displayStartsOn: day('2026-09-22'),
  displayEndsOn: day('2026-09-30'),
};

// Follow-up 39: Borrador, Programada, Activa, Finalizada, Archivada.
describe('promotionState', () => {
  it('is draft while unpublished, whatever the window says', () => {
    expect(
      promotionState({ ...published, publishedAt: null }, day('2026-09-25')),
    ).toBe('draft');
  });

  it('is scheduled before the window, active inside it (inclusive), and ended after it', () => {
    expect(promotionState(published, day('2026-09-21'))).toBe('scheduled');
    expect(promotionState(published, day('2026-09-22'))).toBe('active');
    expect(promotionState(published, day('2026-09-30'))).toBe('active');
    expect(promotionState(published, day('2026-10-01'))).toBe('ended');
  });

  it('is archived once retired, published or not', () => {
    const archivedAt = new Date('2026-09-23T10:00:00.000Z');
    expect(
      promotionState(
        { ...published, publishedAt: null, archivedAt },
        day('2026-09-25'),
      ),
    ).toBe('archived');
  });
});

describe('requirePromotionValues', () => {
  const input = {
    headline: ' Nuevo horario de sábado ',
    description: 'Desde octubre abrimos los sábados por la mañana.',
    displayStartsOn: day('2026-10-01'),
    displayEndsOn: day('2026-10-31'),
  };

  it('trims the copy and keeps a window whose end is not before its start', () => {
    expect(requirePromotionValues(input)).toEqual({
      ...input,
      headline: 'Nuevo horario de sábado',
    });
    expect(
      requirePromotionValues({ ...input, displayEndsOn: input.displayStartsOn })
        .displayEndsOn,
    ).toEqual(input.displayStartsOn);
  });

  it('refuses empty copy, copy over the limits, and an inverted window', () => {
    const failing = (changes: Partial<typeof input>) =>
      expect(() => requirePromotionValues({ ...input, ...changes })).toThrow(
        new PromotionError('invalid_promotion_value'),
      );
    failing({ headline: '   ' });
    failing({ description: '' });
    failing({ headline: 'x'.repeat(81) });
    failing({ description: 'x'.repeat(281) });
    failing({ displayEndsOn: day('2026-09-30') });
  });

  // Finding 82: a draft may be saved before its window is chosen.
  it('keeps a draft without either date, or with only one of them', () => {
    const undated = { ...input, displayStartsOn: null, displayEndsOn: null };
    expect(requirePromotionValues(undated)).toMatchObject({
      displayStartsOn: null,
      displayEndsOn: null,
    });
    expect(
      requirePromotionValues({ ...input, displayEndsOn: null }),
    ).toMatchObject({ displayStartsOn: input.displayStartsOn });
  });
});

describe('requirePublishableWindow', () => {
  it('passes a Promotion with both dates and refuses one missing either', () => {
    const window = {
      displayStartsOn: day('2026-10-01'),
      displayEndsOn: day('2026-10-31'),
    };
    expect(() => requirePublishableWindow(window)).not.toThrow();
    for (const missing of [
      { ...window, displayStartsOn: null },
      { ...window, displayEndsOn: null },
    ]) {
      expect(() => requirePublishableWindow(missing)).toThrow(
        new PromotionError('promotion_dates_required'),
      );
    }
  });
});

describe('orderedPromotionIds', () => {
  it('accepts a permutation of every live Promotion and returns the new order', () => {
    expect(orderedPromotionIds(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('refuses a list that misses, repeats, or adds a Promotion', () => {
    const refused = (requested: string[]) =>
      expect(() => orderedPromotionIds(['a', 'b', 'c'], requested)).toThrow(
        new PromotionError('promotion_order_incomplete'),
      );
    refused(['a', 'b']);
    refused(['a', 'a', 'b']);
    refused(['a', 'b', 'c', 'd']);
  });
});

describe('PromotionError', () => {
  it('maps every code to its RFC 9457 status', () => {
    expect(new PromotionError('promotion_not_found').status).toBe(404);
    expect(new PromotionError('promotion_archived').status).toBe(409);
    expect(new PromotionError('promotion_image_not_ready').status).toBe(409);
    expect(new PromotionError('promotion_image_required').status).toBe(409);
    expect(new PromotionError('promotion_order_incomplete').status).toBe(409);
    expect(new PromotionError('invalid_promotion_value').status).toBe(400);
    expect(new PromotionError('idempotency_key_reused').status).toBe(409);
    expect(new PromotionError('promotion_dates_required').status).toBe(409);
  });
});
