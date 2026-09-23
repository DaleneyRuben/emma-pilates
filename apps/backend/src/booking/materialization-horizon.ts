import { addCivilDays } from '../time/bolivia-time';

// ADR-0059: recurring definitions materialize Bolivia dates today .. today + 30.
export const materializationHorizonDays = 30;

export const materializationHorizon = (
  today: Date,
): { from: Date; through: Date } => ({
  from: today,
  through: addCivilDays(today, materializationHorizonDays),
});
