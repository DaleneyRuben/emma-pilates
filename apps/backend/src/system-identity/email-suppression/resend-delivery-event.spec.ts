import { suppressionsFromResendEvent } from './resend-delivery-event';

const bounced = (type: string) => ({
  type: 'email.bounced',
  created_at: '2026-10-19T15:00:00.000Z',
  data: {
    email_id: 'email-1',
    to: ['Client@Example.com '],
    bounce: { type, subType: 'General', message: 'mailbox does not exist' },
  },
});

describe('Resend delivery events', () => {
  it('suppresses the normalized recipient of a permanent bounce', () => {
    expect(suppressionsFromResendEvent('msg_1', bounced('Permanent'))).toEqual([
      {
        email: 'client@example.com',
        reason: 'HARD_BOUNCE',
        providerEventId: 'msg_1',
        providerOccurredAt: new Date('2026-10-19T15:00:00.000Z'),
      },
    ]);
  });

  it('suppresses the recipient of a complaint', () => {
    expect(
      suppressionsFromResendEvent('msg_2', {
        type: 'email.complained',
        created_at: '2026-10-19T16:00:00.000Z',
        data: { email_id: 'email-2', to: ['client@example.com'] },
      }),
    ).toEqual([
      {
        email: 'client@example.com',
        reason: 'COMPLAINT',
        providerEventId: 'msg_2',
        providerOccurredAt: new Date('2026-10-19T16:00:00.000Z'),
      },
    ]);
  });

  it('keys each recipient of one event apart', () => {
    const event = bounced('Permanent');
    event.data.to = ['a@example.com', 'b@example.com'];

    expect(
      suppressionsFromResendEvent('msg_3', event).map(
        (suppression) => suppression.providerEventId,
      ),
    ).toEqual(['msg_3', 'msg_3:1']);
  });

  it.each([
    ['a transient bounce', bounced('Transient')],
    ['an undetermined bounce', bounced('Undetermined')],
    [
      'a delivery',
      {
        type: 'email.delivered',
        created_at: '2026-10-19T15:00:00.000Z',
        data: { to: ['client@example.com'] },
      },
    ],
    ['an unreadable body', { type: 'email.bounced', data: null }],
    ['a non-object', 'nothing'],
  ])('ignores %s', (_label, event) => {
    expect(suppressionsFromResendEvent('msg_4', event)).toEqual([]);
  });
});
