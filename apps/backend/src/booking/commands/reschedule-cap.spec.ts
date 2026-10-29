import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// FIX-005 review: the booking adapter must not grow another inline
// consumption query. The reason belongs to the reschedule helper.
describe('reschedule cap home', () => {
  it('keeps the consumption reason out of the booking adapter', () => {
    const adapter = readFileSync(
      join(__dirname, 'prisma-booking-commands.ts'),
      'utf8',
    );
    expect(adapter).not.toContain("'CONSUMPTION'");
    expect(adapter).not.toContain('AllowanceAdjustmentReason.CONSUMPTION');
  });
});
