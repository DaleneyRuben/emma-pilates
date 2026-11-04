import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { normalizeContactPhone } from '../../src/phone/bolivian-mobile';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// FIX-036: the one-time migration brings stored phones to «+591 XXXXXXXX»
// exactly as the backend now stores a typed one (decision §19.20). The
// harness applied it to an empty database, so the spec runs it again over
// rows written the old way.
const migration = readFileSync(
  join(
    process.cwd(),
    'prisma/migrations/20261104180000_normalize_bolivian_mobiles/migration.sql',
  ),
  'utf8',
);

const stored = [
  '70000002',
  '60012345',
  ' 7123 4567 ',
  '712-34-567',
  '+59171234567',
  '+591 7123-4567',
  '+591 70000004',
  '+54 9 11 1234 5678',
  '2 2771234',
  '81234567',
];

describe('normalize Bolivian mobiles migration', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('stores every Bolivian mobile of Clients and Staff as the backend does and leaves the rest as typed', async () => {
    const clientIds: string[] = [];
    const staffIds: string[] = [];
    for (const [index, phone] of stored.entries()) {
      const client = await prisma.client.create({
        data: {
          id: randomUUID(),
          name: `Phone ${index}`,
          phone,
          referralCode: `PHONE${index}`,
        },
      });
      clientIds.push(client.id);
      const staff = await prisma.staffMember.create({
        data: { name: `Staff ${index}`, phone, role: 'ASSISTANT' },
      });
      staffIds.push(staff.id);
    }

    await prisma.$executeRawUnsafe(migration.split(';')[0]);
    await prisma.$executeRawUnsafe(migration.split(';')[1]);

    const expected = stored.map((phone) => {
      const normalized = normalizeContactPhone(phone)!;
      return normalized.startsWith('+591 ') ? normalized : phone;
    });
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
    });
    const staff = await prisma.staffMember.findMany({
      where: { id: { in: staffIds } },
    });
    expect(
      clientIds.map((id) => clients.find((row) => row.id === id)!.phone),
    ).toEqual(expected);
    expect(
      staffIds.map((id) => staff.find((row) => row.id === id)!.phone),
    ).toEqual(expected);
    expect(expected.slice(0, 7)).toEqual([
      '+591 70000002',
      '+591 60012345',
      '+591 71234567',
      '+591 71234567',
      '+591 71234567',
      '+591 71234567',
      '+591 70000004',
    ]);
  });
});
