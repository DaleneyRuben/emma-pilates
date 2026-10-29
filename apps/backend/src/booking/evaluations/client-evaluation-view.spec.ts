import { receiptUploadable } from './receipt-uploadable';

describe('client evaluation view', () => {
  it('offers the receipt upload only while the paid Evaluation is pending and has none', () => {
    expect(
      receiptUploadable({ state: 'PENDING', receiptImageAssetId: null }),
    ).toBe(true);
    expect(
      receiptUploadable({ state: 'CONFIRMED', receiptImageAssetId: null }),
    ).toBe(false);
    expect(
      receiptUploadable({ state: 'PENDING', receiptImageAssetId: 'asset-1' }),
    ).toBe(false);
    expect(receiptUploadable(null)).toBe(false);
  });
});
