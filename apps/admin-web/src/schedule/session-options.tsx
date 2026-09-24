import type { AdminClassTypeDto, StaffMemberDto } from "@pilates/api-contracts";

const weekdays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export function ClassTypeOptions({
  classTypes,
}: {
  classTypes: readonly AdminClassTypeDto[];
}) {
  return (
    <>
      <option value="">Elige un tipo de clase</option>
      {classTypes.map((classType) => (
        <option key={classType.id} value={classType.id}>
          {classType.name}
        </option>
      ))}
    </>
  );
}

export function TrainerOptions({
  trainers,
}: {
  trainers: readonly StaffMemberDto[];
}) {
  return (
    <>
      <option value="">Elige una entrenadora</option>
      {trainers.map((trainer) => (
        <option key={trainer.id} value={trainer.id}>
          {trainer.name}
        </option>
      ))}
    </>
  );
}

/** ISO weekdays (Monday = 1), as the backend stores a weekly schedule. */
export function WeekdayOptions() {
  return (
    <>
      <option value="">Elige un día</option>
      {weekdays.map((name, index) => (
        <option key={name} value={String(index + 1)}>
          {name}
        </option>
      ))}
    </>
  );
}
