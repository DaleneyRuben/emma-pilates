import {
  isStorableMobile,
  normalizeContactPhone,
} from '../../../phone/bolivian-mobile';
import type { StaffRoleName } from '../../../booking/staff/staff-management';

// The Android closed test (2026-11-20): the shared staff Accounts are fixed
// here, while the testers' personal data reaches the run only as params,
// never the repository.
export type StudioStaff = {
  key: StaffKey;
  email: string;
  name: string;
  phone: string;
  role: StaffRoleName;
};

export type StudioClient = { email: string; name: string; phone: string };

export type StudioParams = {
  administratorName: string;
  staff: StudioStaff[];
  clients: StudioClient[];
  courtesyAccessEndsOn: Date | null;
};

const staffDefaults = {
  instructora1: { name: 'Instructora 1 (prueba)', role: 'trainer' },
  instructora2: { name: 'Instructora 2 (prueba)', role: 'trainer' },
  asistente: { name: 'Asistente (prueba)', role: 'assistant' },
  coordinadora: { name: 'Coordinadora (prueba)', role: 'coordinator' },
  nutricionista: { name: 'Nutricionista (prueba)', role: 'nutritionist' },
} as const satisfies Record<string, { name: string; role: StaffRoleName }>;

type StaffKey = keyof typeof staffDefaults;

const staffKeys = Object.keys(staffDefaults) as StaffKey[];
const knownParams = [
  'administratorName',
  'staff',
  'clients',
  'courtesyAccessEndsOn',
];
// About twenty Activation Link emails in all, well inside Resend's 100 a day.
const mostClients = 20;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const civilPattern = /^\d{4}-\d{2}-\d{2}$/;

export const staffEmail = (key: StaffKey): string =>
  `emmapilatesstudio+${key}@gmail.com`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const mobile = (value: unknown, code: string): string => {
  const phone = normalizeContactPhone(typeof value === 'string' ? value : null);
  if (phone === null || !isStorableMobile(phone)) throw new Error(code);
  return phone;
};

const staffOf = (value: unknown): StudioStaff[] => {
  const given = value ?? {};
  if (!isRecord(given)) throw new Error('staff_invalid');
  const unknown = Object.keys(given).find(
    (key) => !staffKeys.includes(key as StaffKey),
  );
  if (unknown !== undefined) throw new Error(`staff_unknown: ${unknown}`);
  return staffKeys.map((key, index) => {
    const entry = given[key] ?? {};
    if (!isRecord(entry)) throw new Error('staff_invalid');
    return {
      key,
      email: staffEmail(key),
      name: text(entry.name) ?? staffDefaults[key].name,
      // A placeholder mobile per member until the real one is typed in.
      phone:
        entry.phone === undefined
          ? `+591 7000000${index + 1}`
          : mobile(entry.phone, 'staff_phone_invalid'),
      role: staffDefaults[key].role,
    };
  });
};

const clientsOf = (value: unknown): StudioClient[] => {
  const given = value ?? [];
  if (!Array.isArray(given)) throw new Error('clients_invalid');
  if (given.length > mostClients) throw new Error('too_many_clients');
  const clients = given.map((entry: unknown): StudioClient => {
    if (!isRecord(entry)) throw new Error('clients_invalid');
    const email = text(entry.email)?.toLowerCase();
    if (email === undefined || !emailPattern.test(email)) {
      throw new Error('client_email_invalid');
    }
    const name = text(entry.name);
    if (name === null) throw new Error('client_name_missing');
    return { email, name, phone: mobile(entry.phone, 'client_phone_invalid') };
  });
  const emails = clients.map((client) => client.email);
  if (new Set(emails).size !== emails.length) {
    throw new Error('client_email_repeated');
  }
  return clients;
};

const civilDateOf = (value: unknown): Date | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !civilPattern.test(value)) {
    throw new Error('courtesy_ends_on_invalid');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error('courtesy_ends_on_invalid');
  }
  return date;
};

export const parseStudioParams = (
  params: Record<string, unknown>,
): StudioParams => {
  const unknown = Object.keys(params).find((key) => !knownParams.includes(key));
  if (unknown !== undefined) throw new Error(`param_unknown: ${unknown}`);
  const administratorName =
    params.administratorName === undefined
      ? 'Emma Pilates Studio'
      : text(params.administratorName);
  if (administratorName === null) {
    throw new Error('administrator_name_invalid');
  }
  return {
    administratorName,
    staff: staffOf(params.staff),
    clients: clientsOf(params.clients),
    courtesyAccessEndsOn: civilDateOf(params.courtesyAccessEndsOn),
  };
};
