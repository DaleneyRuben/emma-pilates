export const lifecycleMilestones = [
  'day_2',
  'week_1',
  'day_30',
  'day_90',
] as const;

export type LifecycleMilestone = (typeof lifecycleMilestones)[number];

const dayMilliseconds = 24 * 60 * 60 * 1_000;

export const milestoneOffsets = {
  day_2: 2,
  week_1: 7,
  day_30: 30,
  day_90: 90,
} as const;

export const elapsedCivilDays = (startsOn: Date, today: Date): number =>
  Math.floor((today.getTime() - startsOn.getTime()) / dayMilliseconds);

export const isCourtesyPlan = (plan: {
  priceCentavos: number;
  hiddenAt: Date | null;
}): boolean => plan.priceCentavos === 0 || plan.hiddenAt !== null;

export const isMilestoneDue = (
  milestone: LifecycleMilestone,
  startsOn: Date,
  today: Date,
): boolean => elapsedCivilDays(startsOn, today) >= milestoneOffsets[milestone];

export const dueMilestones = (
  startsOn: Date,
  today: Date,
  alreadySent: ReadonlySet<LifecycleMilestone>,
): LifecycleMilestone[] =>
  lifecycleMilestones.filter(
    (milestone) =>
      isMilestoneDue(milestone, startsOn, today) && !alreadySent.has(milestone),
  );
