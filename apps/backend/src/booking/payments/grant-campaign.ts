import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { requireAdministrator } from '../administration/administration-errors';

// A campaign grants extra classes, never a discount (decisions §5.4). The
// name is the audit's, and the adjustments are the record: there is no
// campaign table. One to four classes, the small grant the owner makes at
// the start of the year and on holidays.
export const campaignClassMaximum = 4;

export type CampaignRecipient = {
  clientId: string;
  name: string;
};

// FIX-064 (walkthrough finding 90): «TODAS las clientas». Every active
// Client gets the classes: on her current Plan, or owed to the next Plan she
// activates. Nobody is skipped any more; `skipped` stays empty so an older
// admin web still reads the answer.
export type CampaignGrant = {
  name: string;
  classes: number;
  granted: CampaignRecipient[];
  owed: CampaignRecipient[];
  skipped: never[];
};

export class CampaignError extends Error {
  readonly status = 400;

  constructor(readonly code: 'invalid_campaign') {
    super(code);
    this.name = 'CampaignError';
  }
}

export type CampaignPreview = {
  /** Every active Client: with a current Plan, or owed. */
  recipientCount: number;
  owed: CampaignRecipient[];
  skipped: never[];
};

export const previewCampaign = async (dependencies: {
  principal: AuthenticatedPrincipal;
  countWithPlan: () => Promise<number>;
  findWithoutPlan: () => Promise<readonly CampaignRecipient[]>;
}): Promise<CampaignPreview> => {
  requireAdministrator(dependencies.principal);
  const [withPlan, owed] = await Promise.all([
    dependencies.countWithPlan(),
    dependencies.findWithoutPlan(),
  ]);
  return {
    recipientCount: withPlan + owed.length,
    owed: [...owed],
    skipped: [],
  };
};

export type CampaignCommand = {
  name: string;
  classes: number;
  idempotencyKey: string;
};

export type LiveRecipient = CampaignRecipient & { subscriptionId: string };

type Dependencies = {
  principal: AuthenticatedPrincipal;
  now: Date;
  today: Date;
  findRecipients: () => Promise<readonly LiveRecipient[]>;
  findWithoutPlan: () => Promise<readonly CampaignRecipient[]>;
  record: (input: {
    subscriptionId: string;
    clientId: string;
    classes: number;
    reason: 'campaign';
    authorAccountId: string;
    campaignName: string;
    now: Date;
  }) => Promise<{ id: string }>;
  owe: (input: {
    clientId: string;
    classes: number;
    authorAccountId: string;
    campaignName: string;
    now: Date;
  }) => Promise<void>;
};

const campaignName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new CampaignError('invalid_campaign');
  }
  return trimmed;
};

export const grantCampaign = async (
  command: CampaignCommand,
  dependencies: Dependencies,
): Promise<CampaignGrant> => {
  const actor = requireAdministrator(dependencies.principal);
  const name = campaignName(command.name);
  if (
    !Number.isInteger(command.classes) ||
    command.classes < 1 ||
    command.classes > campaignClassMaximum
  ) {
    throw new CampaignError('invalid_campaign');
  }
  const [recipients, withoutPlan] = await Promise.all([
    dependencies.findRecipients(),
    dependencies.findWithoutPlan(),
  ]);
  const granted: CampaignRecipient[] = [];
  for (const recipient of recipients) {
    await dependencies.record({
      subscriptionId: recipient.subscriptionId,
      clientId: recipient.clientId,
      classes: command.classes,
      reason: 'campaign',
      authorAccountId: actor.accountId,
      campaignName: name,
      now: dependencies.now,
    });
    granted.push({ clientId: recipient.clientId, name: recipient.name });
  }
  const owed: CampaignRecipient[] = [];
  for (const client of withoutPlan) {
    await dependencies.owe({
      clientId: client.clientId,
      classes: command.classes,
      authorAccountId: actor.accountId,
      campaignName: name,
      now: dependencies.now,
    });
    owed.push({ clientId: client.clientId, name: client.name });
  }
  return { name, classes: command.classes, granted, owed, skipped: [] };
};
