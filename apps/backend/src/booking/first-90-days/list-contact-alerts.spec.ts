import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { AdministrationError } from '../administration/administration-errors';
import { boliviaDate } from '../../time/bolivia-time';
import {
  listContactAlerts,
  visibleContactAlerts,
  type OpenContactAlert,
} from './list-contact-alerts';

const staff = (
  role:
    'assistant' | 'administrator' | 'trainer' | 'nutritionist' | 'coordinator',
): AuthenticatedPrincipal => ({
  accountId: 'staff-account',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: 'staff-id',
    role,
    branchIds: role === 'administrator' || role === 'coordinator' ? [] : ['b1'],
  },
});

const openedAt = new Date('2026-10-08T12:00:00.000Z');
const startedOn = new Date('2026-10-01T00:00:00.000Z');
const today = new Date('2026-10-08T00:00:00.000Z');

const valeria: OpenContactAlert = {
  clientId: 'client-valeria',
  name: 'Valeria Quiroga',
  phone: '+591 70011005',
  startedOn,
  reason: 'no_booking_7_days',
  openedAt,
  bookedAt: [],
};

describe('visibleContactAlerts', () => {
  it('groups reasons, oldest Client first, and drops a Client who booked', () => {
    const danielaOpened = new Date('2026-10-07T12:00:00.000Z');
    const items = visibleContactAlerts(
      [
        valeria,
        {
          clientId: 'client-daniela',
          name: 'Daniela Rojas',
          phone: null,
          startedOn: new Date('2026-10-05T00:00:00.000Z'),
          reason: 'fewer_than_2_classes_by_day_15',
          openedAt: danielaOpened,
          bookedAt: [],
        },
        {
          clientId: 'client-daniela',
          name: 'Daniela Rojas',
          phone: null,
          startedOn: new Date('2026-10-05T00:00:00.000Z'),
          reason: 'no_booking_7_days',
          openedAt: new Date('2026-10-08T15:00:00.000Z'),
          bookedAt: [],
        },
        {
          clientId: 'client-booked',
          name: 'Ya reservó',
          phone: '+591 70011006',
          startedOn,
          reason: 'no_booking_7_days',
          openedAt,
          bookedAt: [new Date('2026-10-08T12:00:01.000Z')],
        },
      ],
      today,
    );

    expect(items.map((item) => item.clientId)).toEqual([
      'client-daniela',
      'client-valeria',
    ]);
    expect(items[0]?.reasons).toEqual([
      'fewer_than_2_classes_by_day_15',
      'no_booking_7_days',
    ]);
  });
});

describe('listContactAlerts', () => {
  it('lists for the Administrator and the Coordinator', async () => {
    const findOpen = jest.fn().mockResolvedValue([valeria]);
    const dependencies = {
      now: () => new Date('2026-10-08T16:00:00.000Z'),
      today: boliviaDate,
      findOpen,
    };

    await expect(
      listContactAlerts(staff('administrator'), dependencies),
    ).resolves.toEqual({
      items: [
        {
          clientId: 'client-valeria',
          name: 'Valeria Quiroga',
          phone: '+591 70011005',
          startedOn,
          reasons: ['no_booking_7_days'],
        },
      ],
      totalItems: 1,
    });
    await expect(
      listContactAlerts(staff('coordinator'), dependencies),
    ).resolves.toEqual({
      items: [
        {
          clientId: 'client-valeria',
          name: 'Valeria Quiroga',
          phone: '+591 70011005',
          startedOn,
          reasons: ['no_booking_7_days'],
        },
      ],
      totalItems: 1,
    });
  });

  it.each([
    ['an Assistant', staff('assistant')],
    ['a Trainer', staff('trainer')],
    ['the Nutritionist', staff('nutritionist')],
  ])('denies %s', async (_who, principal) => {
    const findOpen = jest.fn();
    await expect(
      listContactAlerts(principal, {
        now: () => new Date(),
        today: boliviaDate,
        findOpen,
      }),
    ).rejects.toEqual(new AdministrationError('administration_access_denied'));
    expect(findOpen).not.toHaveBeenCalled();
  });
});
