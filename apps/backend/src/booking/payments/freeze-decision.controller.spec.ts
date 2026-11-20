import { AdministratorFreezesController } from './freeze.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const freezeId = '11111111-1111-4111-8111-111111111111';
const principal = {
  accountId: 'administrator-account',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: 'administrator-id',
    role: 'administrator',
    branchIds: [],
  },
};

// W16 B/C: the refusal reason reaches the command; an earlier admin web's
// body, without one, still decides.
describe('AdministratorFreezesController.decide', () => {
  const decideWith = async (body: unknown) => {
    const decideFreeze = jest.fn().mockResolvedValue({ state: 'refused' });
    const controller = new AdministratorFreezesController(
      { decideFreeze } as never,
      jest.fn().mockResolvedValue(principal),
    );
    await controller.decide(freezeId, bearer, body);
    return decideFreeze;
  };

  it('passes the trimmed refusal reason', async () => {
    const decideFreeze = await decideWith({
      decision: 'refused',
      refusalReason: ' Esas fechas el estudio está cerrado ',
    });
    expect(decideFreeze).toHaveBeenCalledWith(
      {
        freezeId,
        decision: 'refused',
        refusalReason: 'Esas fechas el estudio está cerrado',
      },
      principal,
    );
  });

  it('decides without a reason', async () => {
    const decideFreeze = await decideWith({ decision: 'refused' });
    expect(decideFreeze).toHaveBeenCalledWith(
      { freezeId, decision: 'refused' },
      principal,
    );
  });

  it('answers 400 for a reason on an approval', async () => {
    await expect(
      decideWith({ decision: 'approved', refusalReason: 'No' }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
