import { wholeNumberField } from "../components/form/number-field";

export const sessionMinutesMessage = "Entre 5 y 240 minutos.";

/** How long a Session or weekly row lasts (WEB-027, booking ADR-0004). */
export const sessionMinutesField = wholeNumberField(
  5,
  240,
  sessionMinutesMessage,
);

export const startingMinutes = "60";
