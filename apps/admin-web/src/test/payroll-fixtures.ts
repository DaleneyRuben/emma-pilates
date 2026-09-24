import type {
  AdminSalaryPaymentDto,
  AdminSalaryPaymentPageDto,
} from "@pilates/api-contracts";
import { http } from "msw";
import { apiUrl, jsonResponse } from "./msw";
import {
  camila,
  emma,
  paolaMember,
  rita,
  staffMembersPath,
  staffPage,
} from "./people-fixtures";

export const salaryPaymentsPath = "/api/v1/administrator/salary-payments";

export const salaryRow = (
  suffix: string,
  staffMember: { id: string; name: string },
  amountCentavos: number,
  paidOn: string,
): AdminSalaryPaymentDto => ({
  id: `7a000000-0000-5000-8000-0000000000${suffix}`,
  staffMemberId: staffMember.id,
  staffMemberName: staffMember.name,
  amountCentavos,
  paidOn,
});

export const salaryPage = (
  items: AdminSalaryPaymentDto[],
  extra: Partial<AdminSalaryPaymentPageDto> = {},
): AdminSalaryPaymentPageDto => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
  ...extra,
});

export const emmaSeptember = salaryRow("01", emma, 350_000, "2026-09-20");
export const camilaSeptember = salaryRow("02", camila, 280_050, "2026-09-05");

// AW12's Empleado list: every Staff Member, deactivated ones too.
export const payrollStaffHandler = () =>
  http.get(apiUrl(staffMembersPath), () =>
    jsonResponse({
      ...staffPage([rita, emma, camila, paolaMember]),
      pageSize: 100,
    }),
  );
