import type {
  AdminClientDetailDto,
  AdminClientDto,
  StaffMemberDto,
} from "@pilates/api-contracts";
import { http } from "msw";
import { centro, equipetrol, norte } from "./booking-handlers";
import { apiUrl, jsonResponse } from "./msw";
import { paolaPrincipal } from "./session-handlers";

export const clientsPath = "/api/v1/administrator/clients";
export const staffMembersPath = "/api/v1/administrator/staff-members";

// "Lucía Fernández" → "lucia": emails carry no accents.
const plain = (name: string) =>
  (name.split(" ")[0] ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const clientRow = (
  name: string,
  extra: Partial<AdminClientDto> = {},
): AdminClientDto => ({
  id: `c1000000-0000-5000-8000-${String(name.length).padStart(12, "0")}`,
  name,
  email: `${plain(name)}@example.com`,
  phone: "+591 70011001",
  accountStatus: "active",
  planName: "Paquete de 8 clases",
  subscriptionStatus: "active",
  ...extra,
});

export const lucia = clientRow("Lucía Fernández");
export const sofia = clientRow("Sofía Guzmán Rojas", {
  planName: null,
  subscriptionStatus: "expired",
  phone: null,
});
export const ana = clientRow("Ana Quiroga", {
  planName: null,
  subscriptionStatus: "none",
  accountStatus: "pending",
});

export const clientPage = (
  items: AdminClientDto[],
  extra: Partial<{
    page: number;
    totalItems: number;
    studioClientCount: number;
    activePlanClientCount: number;
  }> = {},
) => ({
  items,
  page: extra.page ?? 1,
  pageSize: 20,
  totalItems: extra.totalItems ?? items.length,
  studioClientCount: extra.studioClientCount ?? 148,
  activePlanClientCount: extra.activePlanClientCount ?? 96,
});

export const luciaDetail: AdminClientDetailDto = {
  id: lucia.id,
  name: lucia.name,
  email: lucia.email,
  phone: lucia.phone,
  accountStatus: "active",
  clientSince: "2024-04-12",
  subscription: {
    status: "active",
    subscription: {
      id: "5b000000-0000-5000-8000-000000000001",
      planName: "Paquete de 8 clases",
      originalClassAllowance: 8,
      remainingClassAllowance: 5,
      startsOn: "2026-09-01",
      endsOn: "2026-09-30",
    },
  },
  creditAvailableCentavos: 105_000,
  referralCode: "LUCIA25",
  referredClientCount: 3,
};

const member = (
  suffix: string,
  name: string,
  extra: Partial<StaffMemberDto> = {},
): StaffMemberDto => ({
  id: `5f000000-0000-5000-8000-0000000000${suffix}`,
  accountId: `5a000000-0000-5000-8000-0000000000${suffix}`,
  name,
  email: `${plain(name)}@emmapilates.bo`,
  phone: "+591 70822001",
  role: "trainer",
  branchIds: [centro.id],
  status: "active",
  activationExpiresAt: null,
  ...extra,
});

export const paolaMember = member("01", "Paola Mendoza", {
  id: paolaPrincipal.identity.staffMemberId,
  role: "administrator",
  branchIds: [],
});
export const emma = member("02", "Emma Vargas", {
  branchIds: [centro.id, equipetrol.id],
});
export const camila = member("03", "Camila Rojas", {
  role: "assistant",
  phone: null,
});
export const valentina = member("04", "Valentina Soria", {
  role: "nutritionist",
  status: "pending",
  branchIds: [norte.id],
  activationExpiresAt: "2026-09-30T15:00:00.000Z",
});
export const rita = member("05", "Rita Salas", { status: "deactivated" });

export const staffPage = (items: StaffMemberDto[]) => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
});

// The Personal table names Branches from every Branch, archived included
// (pageSize 100, status all).
export const allBranchesHandler = () =>
  http.get(apiUrl("/api/v1/administrator/branches"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("status") !== "all") return undefined;
    return jsonResponse({
      items: [centro, equipetrol, norte],
      page: 1,
      pageSize: 100,
      totalItems: 3,
    });
  });
