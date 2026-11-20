import type { PrismaClient } from '../generated/prisma/client';

// E6 B (and W1 on the web): how many classes each Client took before a
// Session (held classes she did not miss), so a roster can say «Primera
// clase» or «12.ª clase».
export const countEarlierClasses = async (
  prisma: PrismaClient,
  clientIds: string[],
  startsAt: Date,
): Promise<Map<string, number>> => {
  if (clientIds.length === 0) return new Map();
  const counts = await prisma.booking.groupBy({
    by: ['clientId'],
    where: {
      clientId: { in: clientIds },
      state: 'BOOKED',
      session: { state: 'SCHEDULED', startsAt: { lt: startsAt } },
      OR: [
        { attendanceRecord: null },
        { attendanceRecord: { outcome: 'ATTENDED' } },
      ],
    },
    _count: { _all: true },
  });
  return new Map(counts.map((row) => [row.clientId, row._count._all]));
};
