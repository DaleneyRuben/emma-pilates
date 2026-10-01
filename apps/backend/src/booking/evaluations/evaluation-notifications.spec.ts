import { evaluationCancelledByStudioNotice } from './evaluation-notifications';

const notice = (startsAt: string, occurredAt: string) =>
  evaluationCancelledByStudioNotice({
    accountId: 'account-1',
    evaluationId: 'evaluation-1',
    startsAt: new Date(startsAt),
    occurredAt: new Date(occurredAt),
  }).message;

describe('evaluationCancelledByStudioNotice (19)', () => {
  it('frees «este mes» when the Evaluation was this month', () => {
    expect(
      notice('2026-09-28T14:30:00.000Z', '2026-09-20T15:00:00.000Z'),
    ).toBe(
      'El estudio canceló tu evaluación nutricional del lunes 28 de septiembre, 10:30. Ya puedes reservar otra este mes.',
    );
  });

  it('names the month when the Evaluation was a later one (MOB-022)', () => {
    expect(
      notice('2026-10-05T14:30:00.000Z', '2026-09-30T15:00:00.000Z'),
    ).toBe(
      'El estudio canceló tu evaluación nutricional del lunes 5 de octubre, 10:30. Ya puedes reservar otra para octubre.',
    );
  });

  it('reads both instants in Bolivia time', () => {
    // 1 October 01:00 UTC is still 30 September in La Paz.
    expect(
      notice('2026-10-01T01:00:00.000Z', '2026-09-30T15:00:00.000Z'),
    ).toMatch(/Ya puedes reservar otra este mes\.$/);
  });
});
