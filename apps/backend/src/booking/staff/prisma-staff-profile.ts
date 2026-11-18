import type { Prisma } from '../../generated/prisma/client';
import { staffPhotoOf } from './photo/staff-photo-of';
import type { StaffProfile } from './staff-profile';
import { staffGenderOf } from '../../system-identity/authentication/staff-gender';

// Perfil's own read (S23, the admin web's top bar), with her photo (FIX-041).
export const findStaffProfile =
  (prisma: Prisma.TransactionClient) =>
  (staffMemberId: string): Promise<StaffProfile | null> =>
    prisma.staffMember
      .findUnique({
        where: { id: staffMemberId },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          gender: true,
          profileImageAssetId: true,
          account: { select: { email: true } },
          branchAssignments: {
            where: { deletedAt: null },
            select: { branch: { select: { id: true, name: true } } },
            orderBy: { branch: { name: 'asc' } },
          },
        },
      })
      .then((member) =>
        member === null || member.account === null
          ? null
          : {
              id: member.id,
              name: member.name,
              email: member.account.email,
              phone: member.phone,
              role: member.role.toLowerCase() as StaffProfile['role'],
              gender: staffGenderOf(member.gender),
              photo: staffPhotoOf(member.profileImageAssetId),
              branches: member.branchAssignments.map(
                (assignment) => assignment.branch,
              ),
            },
      );
