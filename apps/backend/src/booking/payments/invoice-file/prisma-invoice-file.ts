import {
  AuditActorKind,
  AuditOutcome,
  type Prisma,
  type PrismaClient,
} from '../../../generated/prisma/client';
import {
  ImageAssetPurpose,
  ImageAssetState,
} from '../../../generated/prisma/enums';
import { retrySerializable } from '../../../database/retry-serializable';
import type { NotificationRecorder } from '../../../notifications/prisma-notification-store';
import { auditActorOf } from '../../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';
import { saleLabel } from '../payment-label';
import { imageMediaTypes } from '../../../uploads/image-asset-attachments';
import {
  InvoiceFileError,
  normalizeInvoiceFileName,
  type InvoiceFileGateway,
  type InvoiceMediaType,
} from './invoice-file';
import {
  listClientInvoices,
  listStaffInvoices,
  readInvoiceObject,
  readStaffInvoice,
} from './prisma-invoice-file-reads';

type Transaction = Prisma.TransactionClient;

type LockedPayment = {
  client_id: string;
  kind: string;
  plan_name_snapshot: string;
  state: string;
  has_invoice_data: boolean;
};

const lockPayment = async (
  transaction: Transaction,
  paymentId: string,
): Promise<LockedPayment> => {
  const [payment] = await transaction.$queryRaw<LockedPayment[]>`
    SELECT client_id::text AS client_id, kind::text AS kind,
      plan_name_snapshot, state::text AS state,
      invoice_tax_id IS NOT NULL AS has_invoice_data
    FROM booking.payments WHERE id = ${paymentId}::uuid FOR UPDATE`;
  if (payment === undefined) throw new InvoiceFileError('payment_not_found');
  return payment;
};

const currentInvoiceOf = (transaction: Transaction, paymentId: string) =>
  transaction.paymentInvoice.findFirst({
    where: { paymentId, removedAt: null },
    select: { id: true, imageAssetId: true },
  });

const audit = (
  transaction: Transaction,
  input: {
    actionCode: 'payment.invoice_uploaded' | 'payment.invoice_removed';
    paymentId: string;
    principal: AuthenticatedPrincipal;
    now: Date;
    metadata: Prisma.InputJsonObject;
  },
) => {
  const actor = auditActorOf(input.principal);
  return transaction.auditRecord.create({
    data: {
      actionCode: input.actionCode,
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: actor.accountId,
      actorRole: actor.role,
      impersonationId: actor.impersonationId,
      targetType: 'payment',
      targetId: input.paymentId,
      correlationId: input.paymentId,
      occurredAt: input.now,
      metadata: input.metadata,
    },
  });
};

const notifyInvoiceReady = async (
  recordNotification: NotificationRecorder,
  transaction: Transaction,
  input: {
    payment: LockedPayment;
    paymentId: string;
    invoiceId: string;
    now: Date;
  },
) => {
  const client = await transaction.client.findUniqueOrThrow({
    where: { id: input.payment.client_id },
    select: { account: { select: { id: true } } },
  });
  if (client.account === null) return;
  const label = saleLabel({
    kind: input.payment.kind,
    planNameSnapshot: input.payment.plan_name_snapshot,
  });
  await recordNotification(transaction, {
    accountId: client.account.id,
    category: 'subscription_payment',
    type: 'invoice_ready',
    businessEventKey: `invoice-ready:${input.invoiceId}`,
    title: 'Tu factura está lista',
    message: `La factura de tu ${label} ya está en Mis facturas.`,
    destination: { type: 'invoice', id: input.paymentId },
    occurredAt: input.now,
  });
};

// FIX-044: the issued invoice on a Payment. Each write locks the Payment row,
// keeps one current invoice (the partial unique index backs it), hides the
// one it replaces or removes instead of deleting it (ADR-0086), moves the
// «Factura emitida» mark with it, and audits in the same transaction.
export const createPrismaInvoiceFile = (
  prisma: PrismaClient,
  dependencies: { recordNotification: NotificationRecorder },
): InvoiceFileGateway => {
  const serializable = <Result>(
    work: (transaction: Transaction) => Promise<Result>,
  ) =>
    retrySerializable(() =>
      prisma.$transaction(work, { isolationLevel: 'Serializable' }),
    );

  return {
    attach: ({ paymentId, imageAssetId, fileName, principal, now }) =>
      serializable(async (transaction) => {
        const payment = await lockPayment(transaction, paymentId);
        if (payment.state === 'voided') {
          throw new InvoiceFileError('payment_voided');
        }
        if (payment.state !== 'confirmed') {
          throw new InvoiceFileError('payment_not_confirmed');
        }
        if (!payment.has_invoice_data) {
          throw new InvoiceFileError('payment_without_invoice_data');
        }

        const current = await currentInvoiceOf(transaction, paymentId);
        if (current?.imageAssetId === imageAssetId) {
          return readStaffInvoice(transaction, paymentId);
        }
        const asset = await transaction.imageAsset.findUnique({
          where: { id: imageAssetId },
          select: { declaredMediaType: true },
        });
        const attached = await transaction.imageAsset.updateMany({
          where: {
            id: imageAssetId,
            ownerAccountId: principal.accountId,
            purpose: ImageAssetPurpose.INVOICE,
            state: ImageAssetState.READY,
            deletedAt: null,
          },
          data: {
            state: ImageAssetState.ATTACHED,
            attachedAt: now,
            deletionDueAt: null,
          },
        });
        if (asset === null || attached.count !== 1) {
          throw new InvoiceFileError('invoice_file_not_attachable');
        }
        const shownName = normalizeInvoiceFileName(
          fileName,
          imageMediaTypes[asset.declaredMediaType] as InvoiceMediaType,
        );

        if (current !== null) {
          await transaction.paymentInvoice.update({
            where: { id: current.id },
            data: {
              removedAt: now,
              removedByAccountId: principal.accountId,
              removalReason: 'replaced',
            },
          });
        }
        const invoice = await transaction.paymentInvoice.create({
          data: {
            paymentId,
            imageAssetId,
            fileName: shownName,
            uploadedByAccountId: principal.accountId,
            uploadedAt: now,
          },
          select: { id: true },
        });
        await transaction.payment.update({
          where: { id: paymentId },
          data: {
            invoiceIssuedAt: now,
            invoiceIssuedByAccountId: principal.accountId,
          },
        });
        await audit(transaction, {
          actionCode: 'payment.invoice_uploaded',
          paymentId,
          principal,
          now,
          metadata: {
            paymentInvoiceId: invoice.id,
            imageAssetId,
            fileName: shownName,
            replacedPaymentInvoiceId: current?.id ?? null,
          },
        });
        await notifyInvoiceReady(dependencies.recordNotification, transaction, {
          payment,
          paymentId,
          invoiceId: invoice.id,
          now,
        });
        return readStaffInvoice(transaction, paymentId);
      }),

    remove: ({ paymentId, principal, now }) =>
      serializable(async (transaction) => {
        await lockPayment(transaction, paymentId);
        const current = await currentInvoiceOf(transaction, paymentId);
        if (current === null) throw new InvoiceFileError('invoice_not_found');

        await transaction.paymentInvoice.update({
          where: { id: current.id },
          data: {
            removedAt: now,
            removedByAccountId: principal.accountId,
            removalReason: 'removed',
          },
        });
        await transaction.payment.update({
          where: { id: paymentId },
          data: { invoiceIssuedAt: null, invoiceIssuedByAccountId: null },
        });
        await audit(transaction, {
          actionCode: 'payment.invoice_removed',
          paymentId,
          principal,
          now,
          metadata: {
            paymentInvoiceId: current.id,
            imageAssetId: current.imageAssetId,
          },
        });
        return readStaffInvoice(transaction, paymentId);
      }),

    read: (paymentId) => readStaffInvoice(prisma, paymentId),
    listForStaff: (filter) => listStaffInvoices(prisma, filter),
    listForClient: (clientId) => listClientInvoices(prisma, clientId),
    readFileForStaff: (paymentId) => readInvoiceObject(prisma, { paymentId }),
    readFileForClient: ({ paymentId, clientId }) =>
      readInvoiceObject(prisma, { paymentId, clientId }),
  };
};
