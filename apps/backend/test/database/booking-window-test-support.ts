import type { PrismaClient } from '../../src/generated/prisma/client';
import { readCurrentStudioSettings } from '../../src/booking/studio-settings/prisma-studio-settings';

// FIX-026: specs whose fixed clock books weeks ahead open the Booking Window
// to its widest, 30 days, by appending a Studio Settings version, so only the
// rule they test decides. The author is any live Account.
export const widenBookingWindow = async (prisma: PrismaClient) => {
  const author = await prisma.account.findFirstOrThrow({
    where: { deletedAt: null },
    select: { id: true },
  });
  const current = await readCurrentStudioSettings(prisma);
  await prisma.studioSettingsVersion.create({
    data: {
      ...current,
      version: current.version + 1,
      bookingWindowDays: 30,
      openingDate:
        current.openingDate === null
          ? null
          : new Date(`${current.openingDate}T00:00:00.000Z`),
      createdByAccountId: author.id,
    },
  });
};
