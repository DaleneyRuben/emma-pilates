import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type {
  AcquisitionChannel,
  DeclaredAcquisitionChannel,
} from './acquisition';

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
  read: (clientId: string) => Promise<ClientAcquisitionView | null>;
  correct: (input: {
    clientId: string;
    declaredChannel: DeclaredAcquisitionChannel;
    referralCode: string | null;
    actor: AcquisitionActor;
    occurredAt: Date;
  }) => Promise<ClientAcquisitionView | null>;
}

type Dependencies = { store: ClientAcquisitionStore; now: () => Date };

export const readClientAcquisition: (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<ClientAcquisitionView> = () =>
  Promise.reject(new Error('pending'));

export const correctClientAcquisition: (
  command: {
    clientId: string;
    channel: DeclaredAcquisitionChannel;
    referralCode: string | null;
  },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<ClientAcquisitionView> = () =>
  Promise.reject(new Error('pending'));
