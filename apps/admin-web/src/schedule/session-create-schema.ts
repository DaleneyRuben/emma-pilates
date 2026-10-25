import { z } from "zod";
import { parseCivilDate } from "../components/form/civil-date";
import { parseCivilTime } from "../components/form/civil-time";
import { wholeNumberField } from "../components/form/number-field";
import { sessionMinutesMessage } from "./duration-minutes";
import { rowClash } from "./weekly-rows";

const wallClock = (value: string): boolean => parseCivilTime(value) !== null;
const civilDate = (value: string): boolean => parseCivilDate(value) !== null;

const isSessionMinutes = (value: string): boolean =>
  /^\d+$/.test(value.trim()) && Number(value) >= 5 && Number(value) <= 240;

// Both frequencies share one flat shape; which fields are required depends on
// the choice, checked after the field rules. A one-off Session and each
// weekly row carry their own minutes (WEB-027, follow-up 98).
export const createSchema = (today: string) =>
  z
    .object({
      frequency: z.enum(["once", "weekly"]),
      classTypeId: z.string().min(1, "Elige un tipo de clase."),
      trainerStaffMemberId: z.string().min(1, "Elige una entrenadora."),
      time: z.string(),
      durationMinutes: z.string(),
      capacity: wholeNumberField(1, 100, "Entre 1 y 100 lugares."),
      date: z.string(),
      rows: z.array(
        z.object({
          weekday: z.string(),
          time: z.string(),
          durationMinutes: z.string(),
        }),
      ),
      effectiveFrom: z.string(),
    })
    .superRefine((values, context) => {
      const issue = (path: (string | number)[], message: string) =>
        context.addIssue({ code: "custom", path, message });
      const requireDate = (path: "date" | "effectiveFrom", missing: string) => {
        const value = values[path];
        if (!civilDate(value)) issue([path], missing);
        else if (value < today) issue([path], "Elige una fecha desde hoy.");
      };
      if (values.frequency === "once") {
        requireDate("date", "Elige la fecha.");
        if (!wallClock(values.time)) issue(["time"], "Elige la hora.");
        if (!isSessionMinutes(values.durationMinutes)) {
          issue(["durationMinutes"], sessionMinutesMessage);
        }
        return;
      }
      let complete = true;
      values.rows.forEach((row, index) => {
        if (!/^[1-7]$/.test(row.weekday)) {
          complete = false;
          issue(["rows", index, "weekday"], "Elige un día.");
        }
        if (!wallClock(row.time)) {
          complete = false;
          issue(["rows", index, "time"], "Elige la hora.");
        }
        if (!isSessionMinutes(row.durationMinutes)) {
          complete = false;
          issue(["rows", index, "durationMinutes"], sessionMinutesMessage);
        }
      });
      const clash = complete ? rowClash(values.rows) : null;
      if (clash !== null) {
        issue(["rows", clash.index, "time"], clash.message);
      }
      requireDate("effectiveFrom", "Elige desde qué fecha rige.");
    });

export type CreateInput = z.input<ReturnType<typeof createSchema>>;
export type CreateOutput = z.output<ReturnType<typeof createSchema>>;
