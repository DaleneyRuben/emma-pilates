import { boliviaDate } from '../../time/bolivia-time';
import { readClientContact } from './client-contact';
import type { OpenContactAlert } from './list-contact-alerts';

const openedAt = new Date('2026-10-08T12:00:00.000Z');
const now = new Date('2026-10-09T12:00:00.000Z');

const alert: OpenContactAlert = {
  clientId: 'client-valeria',
  name: 'Valeria Quiroga',
  photo: null,
  phone: '+591 70011005',
  startedOn: new Date('2026-10-01T00:00:00.000Z'),
  reason: 'no_booking_7_days',
  openedAt,
  bookedAt: [],
};

const lastContact = {
  contactedAt: new Date('2026-09-30T15:00:00.000Z'),
  contactedByAccountId: 'coordinator-account',
};

// Staff pick E4 A: one Client's contact state for the ficha, read with the
// same rule as Para contactar (BKM-013).
describe('readClientContact', () => {
  const read = (rows: OpenContactAlert[], last: typeof lastContact | null) => {
    const findOpen = jest.fn().mockResolvedValue(rows);
    const findLastContact = jest.fn().mockResolvedValue(last);
    return {
      findOpen,
      findLastContact,
      result: readClientContact('client-valeria', {
        now: () => now,
        today: boliviaDate,
        findOpen,
        findLastContact,
      }),
    };
  };

  it('says she is on the list and when she was last contacted, by whom', async () => {
    const { findOpen, findLastContact, result } = read([alert], lastContact);

    await expect(result).resolves.toEqual({
      onContactList: true,
      lastContactedAt: lastContact.contactedAt,
      lastContactedByAccountId: 'coordinator-account',
    });
    expect(findOpen).toHaveBeenCalledWith('client-valeria');
    expect(findLastContact).toHaveBeenCalledWith('client-valeria');
  });

  it('keeps her off the list once she booked, as the list does', async () => {
    const booked = {
      ...alert,
      bookedAt: [new Date('2026-10-08T13:00:00.000Z')],
    };

    await expect(read([booked], null).result).resolves.toEqual({
      onContactList: false,
      lastContactedAt: null,
      lastContactedByAccountId: null,
    });
  });
});
