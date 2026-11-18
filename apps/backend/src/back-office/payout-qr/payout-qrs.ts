import { ImageAssetNotAttachableError } from '../../uploads/image-asset-attachments';
import type { ReceiptVariant } from '../../uploads/private-image-object';
import {
  auditActorOf,
  type AuditActor,
} from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { BackOfficeError, requireAdministrator } from '../back-office-errors';
import {
  payoutQrStanding,
  validateValidUntil,
  type PayoutQrStanding,
} from './payout-qr-standing';

export type PayoutQr = {
  id: string;
  validUntil: Date;
  standing: PayoutQrStanding;
};

type ImageObject = { objectKey: string; mediaType: string };

export type PayoutQrGateway = {
  findCurrent: (
    staffMemberId: string,
  ) => Promise<{ id: string; validUntil: Date } | null>;
  // Ends the current QR (if any) and keeps the new one, in one transaction.
  replace: (input: {
    staffMemberId: string;
    accountId: string;
    imageAssetId: string;
    validUntil: Date;
    actor: AuditActor;
    now: Date;
  }) => Promise<{ id: string; validUntil: Date }>;
  // Only a current QR; `staffMemberId` limits it to that person's.
  readImage: (input: {
    payoutQrId: string;
    variant: ReceiptVariant;
    staffMemberId: string | null;
  }) => Promise<(ImageObject & { validUntil: Date }) | null>;
};

// Every role on the team is paid a salary and keeps a payout QR.
const ownStaffMemberId = (principal: AuthenticatedPrincipal): string => {
  if (principal.identity.kind !== 'staff') {
    throw new BackOfficeError('back_office_access_denied');
  }
  return principal.identity.staffMemberId;
};

// FIX-072 (walkthrough finding 106, follow-up 276): each staff member keeps
// the QR her bank gives her and its last valid day; the Administrator pays
// by it and never sees one past that day.
export const createPayoutQrs = (dependencies: {
  gateway: PayoutQrGateway;
  now: () => Date;
}) => {
  const { gateway } = dependencies;
  const today = () => boliviaDate(dependencies.now());
  const withStanding = (
    qr: { id: string; validUntil: Date } | null,
  ): PayoutQr | null =>
    qr === null
      ? null
      : { ...qr, standing: payoutQrStanding(qr.validUntil, today()) };

  return {
    readOwn: async (principal: AuthenticatedPrincipal) =>
      withStanding(await gateway.findCurrent(ownStaffMemberId(principal))),

    setOwn: async (
      command: { imageAssetId: string; validUntil: string },
      principal: AuthenticatedPrincipal,
    ): Promise<PayoutQr> => {
      const staffMemberId = ownStaffMemberId(principal);
      const validUntil = validateValidUntil(command.validUntil, today());
      if (validUntil === null) {
        throw new BackOfficeError('payout_qr_valid_until_invalid');
      }
      try {
        const qr = await gateway.replace({
          staffMemberId,
          accountId: principal.accountId,
          imageAssetId: command.imageAssetId,
          validUntil,
          actor: auditActorOf(principal),
          now: dependencies.now(),
        });
        return withStanding(qr) as PayoutQr;
      } catch (error) {
        if (error instanceof ImageAssetNotAttachableError) {
          throw new BackOfficeError('payout_qr_not_ready');
        }
        throw error;
      }
    },

    readForStaffMember: async (
      query: { staffMemberId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      return withStanding(await gateway.findCurrent(query.staffMemberId));
    },

    readOwnImage: async (
      query: { payoutQrId: string; variant: ReceiptVariant },
      principal: AuthenticatedPrincipal,
    ): Promise<ImageObject> => {
      const image = await gateway.readImage({
        ...query,
        staffMemberId: ownStaffMemberId(principal),
      });
      if (image === null) throw new BackOfficeError('payout_qr_not_found');
      return { objectKey: image.objectKey, mediaType: image.mediaType };
    },

    readImageForAdministrator: async (
      query: { payoutQrId: string; variant: ReceiptVariant },
      principal: AuthenticatedPrincipal,
    ): Promise<ImageObject> => {
      requireAdministrator(principal);
      const image = await gateway.readImage({ ...query, staffMemberId: null });
      if (image === null) throw new BackOfficeError('payout_qr_not_found');
      if (payoutQrStanding(image.validUntil, today()) === 'expired') {
        throw new BackOfficeError('payout_qr_expired');
      }
      return { objectKey: image.objectKey, mediaType: image.mediaType };
    },
  };
};

export type PayoutQrs = ReturnType<typeof createPayoutQrs>;
