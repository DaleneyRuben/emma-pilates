import type { StaffGender } from '../../generated/prisma/client';

// FIX-081 (walkthrough finding 118): how a Staff Member's Role reads,
// «Coordinadora» or «Coordinador». The labels themselves live in
// @pilates/api-contracts (`staffRoleLabel`). Type-only Prisma import: unit
// Jest cannot load the generated client.
export const staffGenders = ['female', 'male'] as const;
export type StaffGenderName = (typeof staffGenders)[number];

export const staffGenderOf = (gender: StaffGender): StaffGenderName =>
  gender === 'MALE' ? 'male' : 'female';

export const toStaffGender = (gender: StaffGenderName): StaffGender =>
  gender === 'male' ? 'MALE' : 'FEMALE';
