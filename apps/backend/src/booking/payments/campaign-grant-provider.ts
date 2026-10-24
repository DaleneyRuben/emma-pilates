import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { campaignGrant, campaignPreview } from './campaign.controller';
import { createPrismaCampaignGrant } from './prisma-campaign-grant';

export const campaignGrantProvider = (prismaToken: symbol): Provider[] => [
  {
    provide: campaignGrant,
    inject: [prismaToken],
    useFactory: (prisma: PrismaClient) =>
      createPrismaCampaignGrant(prisma, () => new Date()).grant,
  },
  {
    provide: campaignPreview,
    inject: [prismaToken],
    useFactory: (prisma: PrismaClient) =>
      createPrismaCampaignGrant(prisma, () => new Date()).preview,
  },
];
