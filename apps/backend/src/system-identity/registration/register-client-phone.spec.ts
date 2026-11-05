import { parseStartClientRegistration } from './client-registration.dto';
import { RegisterClient, type RegisterClientCommand } from './register-client';

// FIX-037 (DES-006): the mobile number travels with the self-registration,
// stored as «+<code> <digits>». Current builds always send it; a store build
// older than the field sends none (ADR-0016) and registers without a phone.
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
    unitOfWork: { execute: (work) => work(transaction) },
    passwordHasher: { hash: () => Promise.resolve('hash') },
    tokenIssuer: {
      issue: () => ({ secret: 'secret', digest: Buffer.from('digest') }),
    },
    linkCipher: {
      encrypt: () => ({ encryptedLinkSecret: 'link', encryptionKeyId: 'key' }),
    },
    now: () => new Date('2026-11-05T15:00:00.000Z'),
    newId: () => `id-${(id += 1)}`,
  }).execute(command);
  return createSelfRegistration.mock.calls[0]?.[0];
};

const ana = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'correct horse',
};

describe('Client self-registration phone (FIX-037)', () => {
  it('stores the Bolivian mobile she typed as «+591 XXXXXXXX»', async () => {
    await expect(
      registerWith({ ...ana, phone: '7123 4567' }),
    ).resolves.toMatchObject({ phone: '+591 71234567' });
  });

  it('stores a number from another country with its code', async () => {
    await expect(
      registerWith({ ...ana, phone: '+51 912 345 678' }),
    ).resolves.toMatchObject({ phone: '+51 912345678' });
  });

  it('registers without a phone when an older store build sends none', async () => {
    await expect(registerWith(ana)).resolves.toMatchObject({ phone: null });
  });

  it('accepts a mobile with its country code and refuses anything else', () => {
    expect(
      parseStartClientRegistration({ ...ana, phone: '+591 71234567' }),
    ).toMatchObject({ phone: '+591 71234567' });
    expect(
      parseStartClientRegistration({ ...ana, phone: '+54 91123456789' }),
    ).toMatchObject({ phone: '+54 91123456789' });
    expect(
      parseStartClientRegistration({ ...ana, phone: '+591 5123456' }),
    ).toBeNull();
    expect(parseStartClientRegistration({ ...ana, phone: '' })).toBeNull();
    expect(
      parseStartClientRegistration({ ...ana, phone: 'llámame' }),
    ).toBeNull();
  });
});
