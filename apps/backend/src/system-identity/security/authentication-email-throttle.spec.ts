import { authenticationEmailWaitSeconds } from './authentication-email-throttle';

const now = new Date('2026-09-30T15:00:00.000Z');
const ago = (seconds: number) => ({
  occurredAt: new Date(now.getTime() - seconds * 1_000),
});

describe('authenticationEmailWaitSeconds (ADR-0029 recipient lane)', () => {
  it('lets an email go when every limit has room', () => {
    expect(authenticationEmailWaitSeconds([], now)).toBe(0);
    expect(authenticationEmailWaitSeconds([ago(61)], now)).toBe(0);
  });

  it('waits out the one-per-minute cooldown', () => {
    expect(authenticationEmailWaitSeconds([ago(20)], now)).toBe(40);
  });

  it('waits until the oldest of five emails leaves the rolling hour', () => {
    const events = [ago(3_000), ago(2_400), ago(1_800), ago(1_200), ago(600)];

    expect(authenticationEmailWaitSeconds(events, now)).toBe(600);
  });

  it('waits until enough of ten emails leave the rolling day', () => {
    const hours = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14];
    const events = hours.map((hour) => ago(hour * 3_600));

    expect(authenticationEmailWaitSeconds(events, now)).toBe(3_600);
  });
});
