import { boliviaDate } from '../../time/bolivia-time';

// Finding 105: a pay line says which class or which Client it pays, so the
// Administrator can check it before approving. The text is the line's
// snapshot: an approved statement keeps it even if a name changes later.

const weekdays = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const months = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const clockOf = (instant: Date): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);

// «lun 2 nov · 10:45», in Bolivia.
export const classMoment = (startsAt: Date): string => {
  const day = boliviaDate(startsAt);
  return `${weekdays[day.getUTCDay()]} ${day.getUTCDate()} ${months[day.getUTCMonth()]} · ${clockOf(startsAt)}`;
};

// «Bs 480» or «Bs 1.534,90».
export const bolivianosText = (centavos: number): string => {
  const whole = Math.trunc(centavos / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cents = centavos % 100;
  return cents === 0
    ? `Bs ${whole}`
    : `Bs ${whole},${cents.toString().padStart(2, '0')}`;
};

export const studentsText = (students: number): string =>
  `${students} ${students === 1 ? 'alumna' : 'alumnas'}`;

export type ClassPlace = {
  startsAt: Date;
  branchName: string;
  classTypeName: string;
};

export const classPlaceText = (place: ClassPlace): string =>
  `${classMoment(place.startsAt)} · ${place.branchName} · ${place.classTypeName}`;
