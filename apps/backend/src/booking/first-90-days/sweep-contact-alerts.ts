import {
  shouldOpenFewerThan2ByDay15,
  shouldOpenFewerThan4InFirst30Days,
  shouldOpenNoBooking7Days,
  shouldReopenNoBooking7Days,
  type ContactAlertReason,
} from './first-90-days-alerts';

export type ClientAlertState = {
  clientId: string;
  startsOn: Date;
  lastBookedOn: Date | null;
  lastBookedAt: Date | null;
  hasUpcomingBooking: boolean;
  bookedClassCount: number;
  bookedClassCount30: number;
  openUncontacted: Partial<Record<ContactAlertReason, boolean>>;
  lastContactedAt: Partial<Record<ContactAlertReason, Date | null>>;
  everOpened: Partial<Record<ContactAlertReason, boolean>>;
};

export const reasonsToOpen = (
  state: ClientAlertState,
  today: Date,
): ContactAlertReason[] => {
  const reasons: ContactAlertReason[] = [];
  if (
    shouldReopenNoBooking7Days({
      conditionsHold: shouldOpenNoBooking7Days({
        startsOn: state.startsOn,
        today,
        lastBookedOn: state.lastBookedOn,
        hasUpcomingBooking: state.hasUpcomingBooking,
      }),
      openUncontacted: state.openUncontacted.no_booking_7_days === true,
      lastContactedAt: state.lastContactedAt.no_booking_7_days ?? null,
      lastBookedAt: state.lastBookedAt,
    })
  ) {
    reasons.push('no_booking_7_days');
  }
  if (
    shouldOpenFewerThan2ByDay15({
      startsOn: state.startsOn,
      today,
      bookedClassCount: state.bookedClassCount,
    }) &&
    state.everOpened.fewer_than_2_classes_by_day_15 !== true
  ) {
    reasons.push('fewer_than_2_classes_by_day_15');
  }
  if (
    shouldOpenFewerThan4InFirst30Days({
      startsOn: state.startsOn,
      today,
      bookedClassCount: state.bookedClassCount30,
    }) &&
    state.everOpened.fewer_than_4_classes_in_first_30_days !== true
  ) {
    reasons.push('fewer_than_4_classes_in_first_30_days');
  }
  return reasons;
};

type SweepContactAlertsDependencies = {
  today: Date;
  findClientStates(): Promise<ClientAlertState[]>;
  open(
    alerts: { clientId: string; reason: ContactAlertReason }[],
  ): Promise<number>;
};

export const sweepContactAlerts = async (
  dependencies: SweepContactAlertsDependencies,
): Promise<{ opened: number }> => {
  const states = await dependencies.findClientStates();
  const alerts = states.flatMap((state) =>
    reasonsToOpen(state, dependencies.today).map((reason) => ({
      clientId: state.clientId,
      reason,
    })),
  );
  if (alerts.length === 0) return { opened: 0 };
  return { opened: await dependencies.open(alerts) };
};
