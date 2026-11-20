import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../../generated/prisma/client';
import { createPrismaCatalogAdministration } from '../../../booking/administration/prisma-catalog-administration';
import { createPrismaScheduleBatch } from '../../../booking/administration/prisma-schedule-batch';
import { createPrismaEvaluationCommands } from '../../../booking/evaluations/prisma-evaluation-commands';
import { createPrismaCourtesyAccess } from '../../../booking/payments/prisma-courtesy-access';
import { PrismaStaffManagementUnitOfWork } from '../../../booking/staff/prisma-staff-management';
import type { StaffManagementDependencies } from '../../../booking/staff/staff-management';
import { createPrismaStudioSettings } from '../../../booking/studio-settings/prisma-studio-settings';
import type { AdministratorBootstrapDependencies } from '../../../system-identity/bootstrap/bootstrap-first-administrator';
import { PrismaAdministratorBootstrapUnitOfWork } from '../../../system-identity/bootstrap/prisma-administrator-bootstrap-unit-of-work';
import type { ClientInvitationDependencies } from '../../../system-identity/invitations/client-invitations';
import { PrismaClientInvitationUnitOfWork } from '../../../system-identity/invitations/prisma-client-invitation-unit-of-work';
import { authenticationTokens } from '../../../system-identity/security/authentication-token-service';
import type {
  ScriptAuthenticationEmail,
  ScriptContext,
} from '../../run-script';

// The same services the API composes for the admin web and the Staff app
// (booking.module.ts, system-identity.module.ts, administrator-bootstrap-main),
// so every audit, invariant, and Activation Link email is the product's own.
export const studioServices = (
  prisma: PrismaClient,
  email: ScriptAuthenticationEmail,
  now: () => Date,
) => {
  const bootstrap: AdministratorBootstrapDependencies = {
    unitOfWork: new PrismaAdministratorBootstrapUnitOfWork({
      prisma,
      boss: email.boss,
      digestEmail: (value) => email.digestEmail(value),
      now,
    }),
    tokenIssuer: authenticationTokens,
    linkCipher: email.linkCipher,
    now,
    newId: randomUUID,
  };
  const staff: StaffManagementDependencies = {
    unitOfWork: new PrismaStaffManagementUnitOfWork({
      prisma,
      ...email,
      tokenIssuer: authenticationTokens,
      now,
    }),
    now,
    newId: randomUUID,
  };
  const clientInvitations: ClientInvitationDependencies = {
    unitOfWork: new PrismaClientInvitationUnitOfWork({
      prisma,
      boss: email.boss,
      digestEmail: (value) => email.digestEmail(value),
      now,
    }),
    tokenIssuer: authenticationTokens,
    linkCipher: email.linkCipher,
    now,
    newId: randomUUID,
  };
  return {
    bootstrap,
    staff,
    clientInvitations,
    catalog: createPrismaCatalogAdministration(prisma, { now }),
    schedule: createPrismaScheduleBatch(prisma, { now }),
    studioSettings: createPrismaStudioSettings(prisma, { now }),
    evaluations: createPrismaEvaluationCommands(prisma, { now }),
    courtesyAccess: createPrismaCourtesyAccess(prisma, { now }),
  };
};

export type StudioServices = ReturnType<typeof studioServices>;

// What each step gets: the run, the product services, and a count of the
// Activation Link emails it queued (or would queue on a dry run).
export type StudioRun = {
  context: ScriptContext;
  services: StudioServices;
  queueEmail: () => void;
};
