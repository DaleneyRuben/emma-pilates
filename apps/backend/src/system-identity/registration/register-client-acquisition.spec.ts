import { parseStartClientRegistration } from './client-registration.dto';
import { RegisterClient, type RegisterClientCommand } from './register-client';

// BKM-011: «¿Cómo nos conociste?» travels with the self-registration.
const registerWith = async (command: RegisterClientCommand) => {
  const createSelfRegistration = jest
    .fn<Promise<void>, [Record<string, unknown>]>()
    .mockResolvedValue(undefined);
  const transaction = {
    findAccountByEmail: jest.fn().mockResolvedValue(null),
    canIssueAuthenticationEmail: jest.fn().mockResolvedValue(true),
    recordIssuedAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
    createSelfRegistration,
    replaceSelfRegistrationVerification: jest.fn(),
    replaceStaffInvitationActivation: jest.fn(),
    scheduleAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
  };
  let id = 0;
  await new RegisterClient({
    unitOfWork: {
      execute: (work) => work(transaction),
    },
    passwordHasher: { hash: () => Promise.resolve('hash') },
    tokenIssuer: {
      issue: () => ({ secret: 'secret', digest: Buffer.from('digest') }),
    },
    linkCipher: {
      encrypt: () => ({ encryptedLinkSecret: 'link', encryptionKeyId: 'key' }),
    },
    now: () => new Date('2026-10-23T15:00:00.000Z'),
    newId: () => `id-${(id += 1)}`,
    newReferralCode: () => 'REF-NEW',
  }).execute(command);
  return createSelfRegistration.mock.calls[0]?.[0];
};

const ana = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'correct horse',
};

describe('Client self-registration acquisition (BKM-011)', () => {
  it('stores the channel she picked', async () => {
    await expect(
      registerWith({ ...ana, acquisitionChannel: 'instagram' }),
    ).resolves.toMatchObject({
      acquisitionChannel: 'instagram',
      referredByCode: null,
    });
  });

  it('stores unknown when an older store build sends no channel', async () => {
    await expect(registerWith(ana)).resolves.toMatchObject({
      acquisitionChannel: 'unknown',
    });
  });

  it('accepts the eight channels and refuses anything else', () => {
    expect(
      parseStartClientRegistration({ ...ana, acquisitionChannel: 'walk_in' }),
    ).toMatchObject({ acquisitionChannel: 'walk_in' });
    expect(parseStartClientRegistration(ana)).not.toBeNull();
    expect(
      parseStartClientRegistration({ ...ana, acquisitionChannel: 'unknown' }),
    ).toBeNull();
    expect(
      parseStartClientRegistration({ ...ana, acquisitionChannel: 'radio' }),
    ).toBeNull();
  });
});
