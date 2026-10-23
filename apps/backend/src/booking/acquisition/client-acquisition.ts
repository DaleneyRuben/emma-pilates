import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  normalizeReferralCode,
  type AcquisitionChannel,
  type DeclaredAcquisitionChannel,
} from './acquisition';
import { AcquisitionError } from './acquisition-errors';

export type StaffRoleName = Extract<
  AuthenticatedPrincipal['identity'],
  { kind: 'staff' }
>['role'];

export type AcquisitionActor = { accountId: string; role: StaffRoleName };

export type ClientAcquisitionView = {
  clientId: string;
  declaredChannel: AcquisitionChannel;
  channel: AcquisitionChannel;
  referralCode: string | null;
  referrer: { kind: 'client' | 'trainer'; id: string; name: string } | null;
};

export interface ClientAcquisitionStore {
  /** Null when the Client does not exist; `unknown` when she has no row. */
  read: (clientId: string) => Promise<ClientAcquisitionView | null>;
  /** Rewrites the attribution and audits it; null when the Client is gone. */
  correct: (input: {
    clientId: string;
    declaredChannel: DeclaredAcquisitionChannel;
    referralCode: string | null;
    actor: AcquisitionActor;
    occurredAt: Date;
  }) => Promise<ClientAcquisitionView | null>;
}

type Dependencies = { store: ClientAcquisitionStore; now: () => Date };

// The Roles that read and correct a Client's acquisition on the Client
// detail. The Coordinator (IDN-009, ADR-0102) joins the Administrator here
// once that Role exists; nothing else in this module changes.
export const acquisitionEditorRoles: readonly string[] = ['administrator'];

const requireAcquisitionEditor = (
  principal: AuthenticatedPrincipal,
): AcquisitionActor => {
  if (
    principal.identity.kind !== 'staff' ||
    !acquisitionEditorRoles.includes(principal.identity.role)
  ) {
    throw new AcquisitionError('acquisition_access_denied');
  }
  return { accountId: principal.accountId, role: principal.identity.role };
};

const found = (view: ClientAcquisitionView | null): ClientAcquisitionView => {
  if (view === null) throw new AcquisitionError('client_not_found');
  return view;
};

export const readClientAcquisition = async (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  { store }: Dependencies,
): Promise<ClientAcquisitionView> => {
  requireAcquisitionEditor(principal);
  return found(await store.read(command.clientId));
};

// A correction is judged like a registration: the code, when given, wins.
export const correctClientAcquisition = async (
  command: {
    clientId: string;
    channel: DeclaredAcquisitionChannel;
    referralCode: string | null;
  },
  principal: AuthenticatedPrincipal,
  { store, now }: Dependencies,
): Promise<ClientAcquisitionView> => {
  const actor = requireAcquisitionEditor(principal);
  return found(
    await store.correct({
      clientId: command.clientId,
      declaredChannel: command.channel,
      referralCode: normalizeReferralCode(command.referralCode),
      actor,
      occurredAt: now(),
    }),
  );
};
