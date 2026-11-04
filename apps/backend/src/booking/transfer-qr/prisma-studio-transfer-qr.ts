import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { ObjectStorage } from '../../uploads/object-storage';
import { recordAdministratorAudit } from '../administration/administration-audit';
import { requireAdministrator } from '../administration/administration-errors';
import { normalizeTransferQr, transferQrStorageKey } from './transfer-qr-image';

export const transferQrReplacedAction = 'studio_transfer_qr.replaced';

export type StudioTransferQrView = { updatedAt: Date | null };

export type StudioTransferQr = {
  read: (principal: AuthenticatedPrincipal) => Promise<StudioTransferQrView>;
  replace: (
    principal: AuthenticatedPrincipal,
    bytes: Buffer,
  ) => Promise<StudioTransferQrView>;
};

// WEB-038 «Ajustes › QR del estudio»: the Administrator alone replaces the QR
// clients pay to. The object lives in storage and the audit trail says when
// it last changed, so no table holds it.
export const createStudioTransferQr = (
  prisma: PrismaClient,
  storage: ObjectStorage,
  dependencies: { now: () => Date },
): StudioTransferQr => ({
  read: async (principal) => {
    requireAdministrator(principal);
    const latest = await prisma.auditRecord.findFirst({
      where: { actionCode: transferQrReplacedAction },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    });
    return { updatedAt: latest?.occurredAt ?? null };
  },

  replace: async (principal, bytes) => {
    const actor = requireAdministrator(principal);
    const qr = await normalizeTransferQr(bytes);
    await storage.replace(transferQrStorageKey, qr.png);
    const occurredAt = dependencies.now();
    await recordAdministratorAudit(prisma, actor, {
      actionCode: transferQrReplacedAction,
      targetType: 'studio_transfer_qr',
      targetId: null,
      metadata: {
        byteSize: qr.byteSize,
        width: qr.width,
        height: qr.height,
        sha256: qr.sha256,
      },
      occurredAt,
    });
    return { updatedAt: occurredAt };
  },
});
