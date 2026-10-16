import { deterministicId } from './deterministic-id';

export const DEVELOPMENT_FIXTURE_PASSWORD = 'emma-local-2026';

export type FixtureStaffRole =
  'trainer' | 'assistant' | 'administrator' | 'nutritionist';

export type DevelopmentFixtures = {
  branches: { id: string; name: string; address: string }[];
  classTypes: {
    id: string;
    name: string;
    description: string;
    defaultCapacity: number;
    equipmentNeeds: string | null;
  }[];
  plans: {
    id: string;
    name: string;
    durationMonths: number;
    classAllowance: number;
    priceCentavos: number;
    displayOrder: number;
  }[];
  staffMembers: {
    id: string;
    name: string;
    role: FixtureStaffRole;
    email: string;
    branchIds: string[];
  }[];
  clients: {
    id: string;
    name: string;
    email: string;
    phone: string;
    referralCode: string;
  }[];
  sessionSchedules: {
    id: string;
    branchId: string;
    classTypeId: string;
    trainerStaffMemberId: string;
    weekday: number;
    startsAtLocal: Date;
    durationMinutes: number;
    capacity: number;
    effectiveFrom: Date;
  }[];
  sessions: {
    id: string;
    sessionScheduleId: string;
    branchId: string;
    classTypeId: string;
    trainerStaffMemberId: string;
    startsAt: Date;
    endsAt: Date;
    capacity: number;
  }[];
  subscriptions: {
    id: string;
    clientId: string;
    planId: string;
    planNameSnapshot: string;
    durationMonthsSnapshot: number;
    originalClassAllowance: number;
    remainingClassAllowance: number;
    startsOn: Date;
    endsOn: Date;
    state: 'active' | 'expired';
    activatedAt: Date;
    expiredAt: Date | null;
    paymentId: string | null;
  }[];
  payments: {
    id: string;
    clientId: string;
    planId: string;
    planNameSnapshot: string;
    durationMonthsSnapshot: number;
    classAllowanceSnapshot: number;
    planPriceCentavos: number;
    creditAppliedCentavos: number;
    amountDueCentavos: number;
    method: 'cash';
    state: 'confirmed';
    collectedAtBranchId: string;
    submittedByAccountId: string;
    submittedAt: Date;
    decidedByAccountId: string;
    decidedAt: Date;
  }[];
  referrals: {
    id: string;
    referrerClientId: string;
    referredClientId: string;
    state: 'pending' | 'awarded';
    qualifiedPaymentId: string | null;
    qualifiedAt: Date | null;
    awardCentavos: number | null;
    awardedAt: Date | null;
    createdAt: Date;
  }[];
  availabilityBlocks: {
    id: string;
    nutritionistStaffMemberId: string;
    branchId: string;
    weekday: number;
    startsAtLocal: string;
    endsAtLocal: string;
    effectiveFrom: Date;
    createdByAccountId: string;
  }[];
  creditLedgerEntries: {
    id: string;
    clientId: string;
    kind: 'referral_award';
    amountCentavos: number;
    occurredAt: Date;
    referralId: string;
    actorKind: 'account';
    actorAccountId: string;
    correlationId: string;
  }[];
};

const referralRewardCentavos = 6_000;

const dayMilliseconds = 24 * 60 * 60 * 1_000;
const boliviaOffsetHours = 4;
const materializationDays = 30;
const sessionMinutes = 50;

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * dayMilliseconds);

const isoWeekday = (date: Date): number => ((date.getUTCDay() + 6) % 7) + 1;

const wallClock = (hours: number, minutes: number): Date =>
  new Date(Date.UTC(1970, 0, 1, hours, minutes));

const boliviaInstant = (date: Date, hours: number, minutes: number): Date =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours + boliviaOffsetHours,
      minutes,
    ),
  );

const branchDefinitions = [
  { key: 'centro', name: 'Centro', address: 'Calle Ayacucho 245' },
  { key: 'equipetrol', name: 'Equipetrol', address: 'Av. San Martín 1120' },
  { key: 'urubo', name: 'Urubó', address: 'Condominio Los Tajibos' },
] as const;

const classTypeDefinitions = [
  {
    key: 'reformer',
    name: 'Reformer Pilates',
    description:
      'Clase de Pilates con Reformer, ideal para tonificar todo el cuerpo. Trabajamos fuerza, control y movilidad con acompañamiento cercano en grupos pequeños.',
    defaultCapacity: 12,
    equipmentNeeds: 'Reformer',
  },
  {
    key: 'mat',
    name: 'Mat Pilates',
    description:
      'Pilates en colchoneta con énfasis en centro y respiración. Ideal para complementar tus clases de Reformer.',
    defaultCapacity: 14,
    equipmentNeeds: null,
  },
  {
    key: 'prenatal',
    name: 'Pilates Prenatal',
    description:
      'Clase suave y segura para el embarazo, con foco en respiración, movilidad y fortalecimiento del suelo pélvico.',
    defaultCapacity: 8,
    equipmentNeeds: 'Colchoneta y pelota',
  },
] as const;

const planDefinitions = [
  {
    key: 'paquete-8',
    name: 'Paquete de 8 clases',
    durationMonths: 1,
    classAllowance: 8,
    priceCentavos: 56_000,
  },
  {
    key: 'paquete-12',
    name: 'Paquete de 12 clases',
    durationMonths: 1,
    classAllowance: 12,
    priceCentavos: 78_000,
  },
  {
    key: 'mensual-16',
    name: 'Mensual 16 clases',
    durationMonths: 1,
    classAllowance: 16,
    priceCentavos: 105_000,
  },
  {
    key: 'trimestral-36',
    name: 'Trimestral 36 clases',
    durationMonths: 3,
    classAllowance: 36,
    priceCentavos: 210_000,
  },
] as const;

const staffDefinitions = [
  {
    key: 'emma',
    name: 'Emma Vargas',
    role: 'trainer',
    email: 'emma.vargas@example.com',
    branches: ['centro', 'equipetrol', 'urubo'],
  },
  {
    key: 'daniela',
    name: 'Daniela Ortiz',
    role: 'trainer',
    email: 'daniela.ortiz@example.com',
    branches: ['centro', 'urubo'],
  },
  {
    key: 'andrea',
    name: 'Andrea Suárez',
    role: 'trainer',
    email: 'andrea.suarez@example.com',
    branches: ['equipetrol'],
  },
  {
    key: 'camila',
    name: 'Camila Rojas',
    role: 'assistant',
    email: 'camila.rojas@example.com',
    branches: ['centro'],
  },
  {
    key: 'paola',
    name: 'Paola Mendoza',
    role: 'administrator',
    email: 'paola.mendoza@example.com',
    branches: [],
  },
  {
    key: 'gabriela',
    name: 'Gabriela Flores',
    role: 'nutritionist',
    email: 'gabriela.flores@example.com',
    branches: ['centro'],
  },
] as const satisfies readonly {
  key: string;
  name: string;
  role: FixtureStaffRole;
  email: string;
  branches: readonly (typeof branchDefinitions)[number]['key'][];
}[];

const clientDefinitions = [
  {
    key: 'lucia',
    name: 'Lucía Fernández',
    email: 'lucia@example.com',
    phone: '+591 70011001',
  },
  {
    key: 'valeria',
    name: 'Valeria Quiroga',
    email: 'valeria@example.com',
    phone: '+591 70011002',
  },
  {
    key: 'isabel',
    name: 'Isabel Arce',
    email: 'isabel@example.com',
    phone: '+591 70011003',
  },
  {
    key: 'sofia',
    name: 'Sofía Guzmán',
    email: 'sofia@example.com',
    phone: '+591 70011004',
  },
  {
    key: 'mariana',
    name: 'Mariana Peña',
    email: 'mariana@example.com',
    phone: '+591 70011005',
  },
] as const;

type ScheduleDefinition = {
  branch: (typeof branchDefinitions)[number]['key'];
  classType: (typeof classTypeDefinitions)[number]['key'];
  trainer: 'emma' | 'daniela' | 'andrea';
  weekdays: readonly number[];
  hours: number;
  minutes: number;
  capacity: number;
};

// Every Branch has one room and a Trainer never leads overlapping Sessions,
// so each Branch time slot and each Trainer time slot below is unique.
const scheduleDefinitions: readonly ScheduleDefinition[] = [
  {
    branch: 'centro',
    classType: 'reformer',
    trainer: 'emma',
    weekdays: [1, 3, 5],
    hours: 7,
    minutes: 0,
    capacity: 12,
  },
  {
    branch: 'centro',
    classType: 'mat',
    trainer: 'daniela',
    weekdays: [2, 4],
    hours: 9,
    minutes: 0,
    capacity: 14,
  },
  {
    branch: 'centro',
    classType: 'reformer',
    trainer: 'daniela',
    weekdays: [1, 2, 3, 4, 5],
    hours: 18,
    minutes: 30,
    capacity: 12,
  },
  {
    branch: 'equipetrol',
    classType: 'reformer',
    trainer: 'emma',
    weekdays: [2, 4],
    hours: 7,
    minutes: 0,
    capacity: 12,
  },
  {
    branch: 'equipetrol',
    classType: 'prenatal',
    trainer: 'andrea',
    weekdays: [1, 3],
    hours: 17,
    minutes: 0,
    capacity: 8,
  },
  {
    branch: 'urubo',
    classType: 'mat',
    trainer: 'daniela',
    weekdays: [6],
    hours: 9,
    minutes: 0,
    capacity: 14,
  },
  {
    branch: 'urubo',
    classType: 'reformer',
    trainer: 'emma',
    weekdays: [6],
    hours: 10,
    minutes: 0,
    capacity: 12,
  },
];

type SubscriptionDefinition = {
  client: (typeof clientDefinitions)[number]['key'];
  plan: (typeof planDefinitions)[number]['key'];
  startsInDays: number;
  endsInDays: number;
  remainingClassAllowance: number;
  state: 'active' | 'expired';
};

const subscriptionDefinitions: readonly SubscriptionDefinition[] = [
  {
    client: 'lucia',
    plan: 'paquete-8',
    startsInDays: -10,
    endsInDays: 20,
    remainingClassAllowance: 5,
    state: 'active',
  },
  {
    client: 'valeria',
    plan: 'paquete-12',
    startsInDays: -27,
    endsInDays: 3,
    remainingClassAllowance: 2,
    state: 'active',
  },
  {
    client: 'isabel',
    plan: 'mensual-16',
    startsInDays: -15,
    endsInDays: 15,
    remainingClassAllowance: 0,
    state: 'active',
  },
  {
    client: 'sofia',
    plan: 'paquete-8',
    startsInDays: -40,
    endsInDays: -10,
    remainingClassAllowance: 3,
    state: 'expired',
  },
];

type CashPaymentDefinition = {
  client: (typeof clientDefinitions)[number]['key'];
  plan: (typeof planDefinitions)[number]['key'];
  branch: (typeof branchDefinitions)[number]['key'];
  collectedBy: (typeof staffDefinitions)[number]['key'];
};

// Valeria paid her current Plan in cash at the front desk, which is what
// qualifies Sofía's referral below.
const cashPaymentDefinitions: readonly CashPaymentDefinition[] = [
  {
    client: 'valeria',
    plan: 'paquete-12',
    branch: 'centro',
    collectedBy: 'paola',
  },
];

type ReferralDefinition = {
  referrer: (typeof clientDefinitions)[number]['key'];
  referred: (typeof clientDefinitions)[number]['key'];
  registeredDaysAgo: number;
};

const referralDefinitions: readonly ReferralDefinition[] = [
  { referrer: 'sofia', referred: 'valeria', registeredDaysAgo: 35 },
  { referrer: 'sofia', referred: 'mariana', registeredDaysAgo: 5 },
];

type AvailabilityBlockDefinition = {
  key: string;
  nutritionist: (typeof staffDefinitions)[number]['key'];
  branch: (typeof branchDefinitions)[number]['key'];
  weekday: number;
  startsAtLocal: string;
  endsAtLocal: string;
};

// Gabriela's weekly consultation hours from the Nutritionist designs
// (S16: Monday 9:00–13:00, Saturday 9:00–12:00) plus a Thursday afternoon.
const availabilityBlockDefinitions: readonly AvailabilityBlockDefinition[] = [
  {
    key: 'monday-morning',
    nutritionist: 'gabriela',
    branch: 'centro',
    weekday: 1,
    startsAtLocal: '09:00',
    endsAtLocal: '13:00',
  },
  {
    key: 'thursday-afternoon',
    nutritionist: 'gabriela',
    branch: 'centro',
    weekday: 4,
    startsAtLocal: '15:00',
    endsAtLocal: '18:00',
  },
  {
    key: 'saturday-morning',
    nutritionist: 'gabriela',
    branch: 'centro',
    weekday: 6,
    startsAtLocal: '09:00',
    endsAtLocal: '12:00',
  },
];

export const buildDevelopmentFixtures = (input: {
  today: Date;
}): DevelopmentFixtures => {
  const branchId = (key: string) => deterministicId(`branch:${key}`);
  const classTypeId = (key: string) => deterministicId(`class-type:${key}`);
  const planId = (key: string) => deterministicId(`plan:${key}`);
  const staffId = (key: string) => deterministicId(`staff-member:${key}`);
  const clientId = (key: string) => deterministicId(`client:${key}`);

  const sessionSchedules: DevelopmentFixtures['sessionSchedules'] =
    scheduleDefinitions.flatMap((definition) =>
      definition.weekdays.map((weekday) => ({
        id: deterministicId(
          `session-schedule:${definition.branch}:${definition.classType}:${definition.trainer}:${weekday}:${definition.hours}:${definition.minutes}`,
        ),
        branchId: branchId(definition.branch),
        classTypeId: classTypeId(definition.classType),
        trainerStaffMemberId: staffId(definition.trainer),
        weekday,
        startsAtLocal: wallClock(definition.hours, definition.minutes),
        durationMinutes: sessionMinutes,
        capacity: definition.capacity,
        effectiveFrom: addDays(input.today, -28),
      })),
    );

  const sessions: DevelopmentFixtures['sessions'] = sessionSchedules.flatMap(
    (schedule) =>
      Array.from({ length: materializationDays }, (_, offset) =>
        addDays(input.today, offset),
      )
        .filter((date) => isoWeekday(date) === schedule.weekday)
        .map((date) => {
          const startsAt = boliviaInstant(
            date,
            schedule.startsAtLocal.getUTCHours(),
            schedule.startsAtLocal.getUTCMinutes(),
          );

          return {
            id: deterministicId(
              `session:${schedule.id}:${startsAt.toISOString()}`,
            ),
            sessionScheduleId: schedule.id,
            branchId: schedule.branchId,
            classTypeId: schedule.classTypeId,
            trainerStaffMemberId: schedule.trainerStaffMemberId,
            startsAt,
            endsAt: new Date(
              startsAt.getTime() + schedule.durationMinutes * 60 * 1_000,
            ),
            capacity: schedule.capacity,
          };
        }),
  );

  const planOf = (key: string) => {
    const plan = planDefinitions.find((candidate) => candidate.key === key);
    if (!plan) throw new Error(`Unknown plan ${key}`);
    return plan;
  };
  const accountIdOf = (staffKey: string) => {
    const member = staffDefinitions.find(
      (candidate) => candidate.key === staffKey,
    );
    if (!member) throw new Error(`Unknown staff member ${staffKey}`);
    return deterministicId(`account:${member.email}`);
  };
  const paymentIdOf = (client: string, plan: string) =>
    deterministicId(`payment:${client}:${plan}`);

  const subscriptions: DevelopmentFixtures['subscriptions'] =
    subscriptionDefinitions.map((definition) => {
      const plan = planOf(definition.plan);
      const startsOn = addDays(input.today, definition.startsInDays);
      const endsOn = addDays(input.today, definition.endsInDays);
      const paidInCash = cashPaymentDefinitions.some(
        (payment) =>
          payment.client === definition.client &&
          payment.plan === definition.plan,
      );

      return {
        id: deterministicId(
          `subscription:${definition.client}:${definition.plan}`,
        ),
        clientId: clientId(definition.client),
        planId: planId(plan.key),
        planNameSnapshot: plan.name,
        durationMonthsSnapshot: plan.durationMonths,
        originalClassAllowance: plan.classAllowance,
        remainingClassAllowance: definition.remainingClassAllowance,
        startsOn,
        endsOn,
        state: definition.state,
        activatedAt: boliviaInstant(startsOn, 12, 0),
        expiredAt:
          definition.state === 'expired'
            ? boliviaInstant(addDays(endsOn, 1), 0, 0)
            : null,
        paymentId: paidInCash
          ? paymentIdOf(definition.client, definition.plan)
          : null,
      };
    });

  const payments: DevelopmentFixtures['payments'] = cashPaymentDefinitions.map(
    (definition) => {
      const plan = planOf(definition.plan);
      const subscription = subscriptions.find(
        (candidate) =>
          candidate.paymentId ===
          paymentIdOf(definition.client, definition.plan),
      );
      if (!subscription) {
        throw new Error(
          `Cash payment ${definition.client}:${definition.plan} has no subscription`,
        );
      }
      const collectedBy = accountIdOf(definition.collectedBy);

      return {
        id: paymentIdOf(definition.client, definition.plan),
        clientId: clientId(definition.client),
        planId: planId(plan.key),
        planNameSnapshot: plan.name,
        durationMonthsSnapshot: plan.durationMonths,
        classAllowanceSnapshot: plan.classAllowance,
        planPriceCentavos: plan.priceCentavos,
        creditAppliedCentavos: 0,
        amountDueCentavos: plan.priceCentavos,
        method: 'cash',
        state: 'confirmed',
        collectedAtBranchId: branchId(definition.branch),
        submittedByAccountId: collectedBy,
        submittedAt: subscription.activatedAt,
        decidedByAccountId: collectedBy,
        decidedAt: subscription.activatedAt,
      };
    },
  );

  const referrals: DevelopmentFixtures['referrals'] = referralDefinitions.map(
    (definition) => {
      const referredClientId = clientId(definition.referred);
      const qualifyingPayment = payments.find(
        (payment) => payment.clientId === referredClientId,
      );
      const createdAt = boliviaInstant(
        addDays(input.today, -definition.registeredDaysAgo),
        10,
        0,
      );
      const awarded =
        qualifyingPayment !== undefined &&
        qualifyingPayment.decidedAt.getTime() > createdAt.getTime();

      return {
        id: deterministicId(
          `referral:${definition.referrer}:${definition.referred}`,
        ),
        referrerClientId: clientId(definition.referrer),
        referredClientId,
        state: awarded ? 'awarded' : 'pending',
        qualifiedPaymentId: awarded ? qualifyingPayment.id : null,
        qualifiedAt: awarded ? qualifyingPayment.decidedAt : null,
        awardCentavos: awarded ? referralRewardCentavos : null,
        awardedAt: awarded ? qualifyingPayment.decidedAt : null,
        createdAt,
      };
    },
  );

  const creditLedgerEntries: DevelopmentFixtures['creditLedgerEntries'] =
    referrals.flatMap((referral) => {
      if (referral.state !== 'awarded' || referral.awardedAt === null) {
        return [];
      }
      const payment = payments.find(
        (candidate) => candidate.id === referral.qualifiedPaymentId,
      );
      if (!payment) throw new Error(`Referral ${referral.id} lost its payment`);

      return [
        {
          id: deterministicId(`credit-ledger:referral-award:${referral.id}`),
          clientId: referral.referrerClientId,
          kind: 'referral_award' as const,
          amountCentavos: referralRewardCentavos,
          occurredAt: referral.awardedAt,
          referralId: referral.id,
          actorKind: 'account' as const,
          actorAccountId: payment.decidedByAccountId,
          correlationId: deterministicId(
            `correlation:referral-award:${referral.id}`,
          ),
        },
      ];
    });

  return {
    branches: branchDefinitions.map(({ key, name, address }) => ({
      id: branchId(key),
      name,
      address,
    })),
    classTypes: classTypeDefinitions.map(({ key, ...classType }) => ({
      id: classTypeId(key),
      ...classType,
    })),
    plans: planDefinitions.map(({ key, ...plan }, displayOrder) => ({
      id: planId(key),
      ...plan,
      displayOrder,
    })),
    staffMembers: staffDefinitions.map(({ key, branches, ...member }) => ({
      id: staffId(key),
      ...member,
      branchIds: branches.map(branchId),
    })),
    clients: clientDefinitions.map(({ key, ...client }) => ({
      id: clientId(key),
      ...client,
      referralCode: `REF-${key.toUpperCase()}`,
    })),
    sessionSchedules,
    sessions,
    subscriptions,
    payments,
    referrals,
    creditLedgerEntries,
    availabilityBlocks: availabilityBlockDefinitions.map((definition) => {
      const nutritionist = staffDefinitions.find(
        (member) => member.key === definition.nutritionist,
      );
      if (!nutritionist) {
        throw new Error(`Unknown Nutritionist ${definition.nutritionist}`);
      }

      return {
        id: deterministicId(
          `availability-block:${definition.nutritionist}:${definition.key}`,
        ),
        nutritionistStaffMemberId: staffId(definition.nutritionist),
        branchId: branchId(definition.branch),
        weekday: definition.weekday,
        startsAtLocal: definition.startsAtLocal,
        endsAtLocal: definition.endsAtLocal,
        effectiveFrom: input.today,
        createdByAccountId: accountIdOf(definition.nutritionist),
      };
    }),
  };
};
