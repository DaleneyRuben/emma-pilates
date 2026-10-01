import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  StaffManagementError,
  type StaffManagementTransaction,
  type StaffMemberRecord,
} from './staff-management';

export const now = new Date('2026-09-23T15:00:00.000Z');
export const day = 24 * 60 * 60 * 1_000;

export const principal = (
  role:
    | 'administrator'
    | 'assistant'
    | 'trainer'
    | 'nutritionist' = 'administrator',
  staffMemberId = 'admin-staff',
): AuthenticatedPrincipal => ({
  accountId: 'admin-account',
  authenticationSessionId: 'session',
  identity: { kind: 'staff', staffMemberId, role, branchIds: [] },
});
export const administrator = principal();

export const record = (
  overrides: Partial<StaffMemberRecord> = {},
): StaffMemberRecord => ({
  id: 'staff-1',
  accountId: 'account-1',
  name: 'Daniela Ortiz',
  email: 'daniela@example.com',
  phone: null,
  role: 'trainer',
  branchIds: ['centro', 'urubo'],
  status: 'active',
  activationExpiresAt: null,
  ...overrides,
});

export const createTransaction = (
  overrides: Partial<jest.Mocked<StaffManagementTransaction>> = {},
): jest.Mocked<StaffManagementTransaction> => ({
  findAccountByEmail: jest.fn().mockResolvedValue(null),
  findStaffMember: jest.fn().mockResolvedValue(record()),
  findUsableBranchIds: jest
    .fn()
    .mockImplementation((ids: string[]) =>
      Promise.resolve(ids.filter((id) => id !== 'archived')),
    ),
  countActiveAdministrators: jest.fn().mockResolvedValue(2),
  countTrainerCommitments: jest.fn().mockResolvedValue(0),
  activationEmailWaitSeconds: jest.fn().mockResolvedValue(0),
  setAccountEmail: jest.fn().mockResolvedValue(undefined),
  removePendingStaffMember: jest.fn().mockResolvedValue(undefined),
  createPendingStaffMember: jest.fn().mockResolvedValue(undefined),
  reissueActivation: jest.fn().mockResolvedValue(undefined),
  setRole: jest.fn().mockResolvedValue(undefined),
  replaceBranches: jest.fn().mockResolvedValue(undefined),
  endNutritionistAvailability: jest.fn().mockResolvedValue(undefined),
  disableAccount: jest.fn().mockResolvedValue(undefined),
  recordAudit: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

let ids = 0;
export const resetIds = (): void => {
  ids = 0;
};
export const dependencies = (transaction: StaffManagementTransaction) => ({
  unitOfWork: {
    execute: <Result>(
      work: (tx: StaffManagementTransaction) => Promise<Result>,
    ) => work(transaction),
  },
  now: () => now,
  newId: () => `id-${(ids += 1)}`,
});

export const rejectsWith = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toBeInstanceOf(StaffManagementError);
  await expect(promise).rejects.toMatchObject({ code });
};
