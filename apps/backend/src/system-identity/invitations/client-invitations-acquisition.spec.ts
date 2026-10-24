import { inviteClient } from './client-invitations';
import { parseInviteClient } from './client-invitations.dto';
import {
  assistant,
  createTransaction,
  dependencies,
  resetIds,
} from './client-invitations-test-support';

beforeEach(resetIds);

const ana = { name: 'Ana Nueva', email: 'ana@example.com', phone: null };

// BKM-011: the Assistant asks «¿Cómo nos conociste?» and the optional code.
describe('Assistant invitation acquisition', () => {
  it('passes the channel and the normalized code to the new Client', async () => {
    const transaction = createTransaction();

    await inviteClient(
      { ...ana, acquisitionChannel: 'walk_in', referralCode: ' carla ' },
      assistant,
      dependencies(transaction),
    );

    expect(transaction.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        acquisitionChannel: 'walk_in',
        referredByCode: 'CARLA',
      }),
    );
  });

  it('records unknown and no code for an older Staff build', async () => {
    const transaction = createTransaction();

    await inviteClient(ana, assistant, dependencies(transaction));

    expect(transaction.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        acquisitionChannel: 'unknown',
        referredByCode: null,
      }),
    );
  });

  it('reads the optional channel and code from the request', () => {
    expect(
      parseInviteClient({
        name: 'Ana',
        email: 'ana@example.com',
        acquisitionChannel: 'tiktok',
        referralCode: 'CARLA',
      }),
    ).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      phone: null,
      acquisitionChannel: 'tiktok',
      referralCode: 'CARLA',
    });
    expect(
      parseInviteClient({ name: 'Ana', email: 'ana@example.com' }),
    ).toEqual({ name: 'Ana', email: 'ana@example.com', phone: null });
    expect(
      parseInviteClient({
        name: 'Ana',
        email: 'ana@example.com',
        acquisitionChannel: 'unknown',
      }),
    ).toBeNull();
  });
});
