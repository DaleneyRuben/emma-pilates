import type { PrismaClient } from '../generated/prisma/client';

// Walkthrough n.º 12 (E-F07): a review notice shows whose receipt or Freeze
// it is, the plan and the amount, and once decided how and by whom.
export type NotificationReview = {
  subject: 'payment' | 'freeze';
  clientName: string;
  planName: string;
  amountCentavos: number | null;
  /** A Freeze's days, as `YYYY-MM-DD`; null for a payment. */
  startsOn: string | null;
  endsOn: string | null;
  outcome: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  decidedByName: string | null;
  decidedAt: Date | null;
};

// Walkthrough n.º 11 (E-F20): a feedback notice shows who wrote and how the
// text begins, and opens that comment.
export type NotificationFeedback = {
  feedbackId: string;
  authorName: string;
  type: 'problem' | 'suggestion' | 'other';
  app: 'client' | 'staff';
  excerpt: string;
};

export type NotificationSubject = {
  review: NotificationReview | null;
  feedback: NotificationFeedback | null;
};

type NoticeRef = {
  id: string;
  type: string;
  destinationType: string | null;
  destinationId: string | null;
};

const excerptLength = 55;

const excerptOf = (text: string): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= excerptLength) return flat;
  // Cut at a word's end: the limit itself when a space follows it.
  const end =
    flat[excerptLength] === ' '
      ? excerptLength
      : flat.lastIndexOf(' ', excerptLength);
  const cut = flat.slice(0, end > 0 ? end : excerptLength);
  return `${cut.replace(/[\s.,;:]+$/, '')}…`;
};

const dayOf = (date: Date): string => date.toISOString().slice(0, 10);

const idsOf = (notices: NoticeRef[], type: string, destination: string) =>
  notices
    .filter(
      (notice) =>
        notice.type === type &&
        notice.destinationType === destination &&
        notice.destinationId !== null,
    )
    .map((notice) => notice.destinationId as string);

const paymentOutcome = {
  PENDING: 'pending',
  CONFIRMED: 'approved',
  VOIDED: 'approved',
  REJECTED: 'rejected',
} as const;

const freezeOutcome = {
  REQUESTED: 'pending',
  APPROVED: 'approved',
  REFUSED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

const accountName = (
  account: {
    client: { name: string } | null;
    staffMember: { name: string } | null;
  } | null,
): string | null => account?.staffMember?.name ?? account?.client?.name ?? null;

const nameSelect = {
  client: { select: { name: true } },
  staffMember: { select: { name: true } },
} as const;

/**
 * What each review or feedback notice is about, keyed by notification id.
 * Other notices are absent from the map.
 */
export const readNotificationSubjects = async (
  prisma: Pick<PrismaClient, 'payment' | 'freeze' | 'feedback' | 'account'>,
  notices: NoticeRef[],
): Promise<Map<string, NotificationSubject>> => {
  const paymentIds = idsOf(notices, 'payment_submitted', 'payment');
  const freezeIds = idsOf(notices, 'freeze_requested', 'freeze');
  const feedbackIds = idsOf(notices, 'feedback_received', 'feedback');
  const payments =
    paymentIds.length === 0
      ? []
      : await prisma.payment.findMany({
          where: { id: { in: paymentIds } },
          select: {
            id: true,
            state: true,
            planNameSnapshot: true,
            amountDueCentavos: true,
            decidedAt: true,
            decidedByAccountId: true,
            client: { select: { name: true } },
          },
        });
  const freezes =
    freezeIds.length === 0
      ? []
      : await prisma.freeze.findMany({
          where: { id: { in: freezeIds } },
          select: {
            id: true,
            state: true,
            startsOn: true,
            endsOn: true,
            decidedAt: true,
            decidedByAccountId: true,
            client: { select: { name: true } },
            subscription: { select: { planNameSnapshot: true } },
          },
        });
  const feedback =
    feedbackIds.length === 0
      ? []
      : await prisma.feedback.findMany({
          where: { id: { in: feedbackIds } },
          select: {
            id: true,
            type: true,
            app: true,
            text: true,
            account: { select: nameSelect },
          },
        });
  const deciderIds = [
    ...payments.map((payment) => payment.decidedByAccountId),
    ...freezes.map((freeze) => freeze.decidedByAccountId),
  ].filter((id): id is string => id !== null);
  const deciders =
    deciderIds.length === 0
      ? []
      : await prisma.account.findMany({
          where: { id: { in: deciderIds } },
          select: { id: true, ...nameSelect },
        });
  const deciderName = (id: string | null) =>
    id === null ? null : accountName(deciders.find((a) => a.id === id) ?? null);

  const subjects = new Map<string, NotificationSubject>();
  for (const notice of notices) {
    const payment = payments.find((row) => row.id === notice.destinationId);
    if (notice.type === 'payment_submitted' && payment !== undefined) {
      const outcome = paymentOutcome[payment.state];
      subjects.set(notice.id, {
        review: {
          subject: 'payment',
          clientName: payment.client.name,
          planName: payment.planNameSnapshot,
          amountCentavos: payment.amountDueCentavos,
          startsOn: null,
          endsOn: null,
          outcome,
          decidedByName:
            outcome === 'pending'
              ? null
              : deciderName(payment.decidedByAccountId),
          decidedAt: outcome === 'pending' ? null : payment.decidedAt,
        },
        feedback: null,
      });
      continue;
    }
    const freeze = freezes.find((row) => row.id === notice.destinationId);
    if (notice.type === 'freeze_requested' && freeze !== undefined) {
      subjects.set(notice.id, {
        review: {
          subject: 'freeze',
          clientName: freeze.client.name,
          planName: freeze.subscription.planNameSnapshot,
          amountCentavos: null,
          startsOn: dayOf(freeze.startsOn),
          endsOn: dayOf(freeze.endsOn),
          outcome: freezeOutcome[freeze.state],
          decidedByName: deciderName(freeze.decidedByAccountId),
          decidedAt: freeze.decidedAt,
        },
        feedback: null,
      });
      continue;
    }
    const comment = feedback.find((row) => row.id === notice.destinationId);
    if (notice.type === 'feedback_received' && comment !== undefined) {
      subjects.set(notice.id, {
        review: null,
        feedback: {
          feedbackId: comment.id,
          authorName: accountName(comment.account) ?? '',
          type: comment.type.toLowerCase() as NotificationFeedback['type'],
          app: comment.app.toLowerCase() as NotificationFeedback['app'],
          excerpt: excerptOf(comment.text),
        },
      });
    }
  }
  return subjects;
};
