import type {
  AdminPromotionContactDto,
  AdminPromotionContactPageDto,
} from "@pilates/api-contracts";

export const promotionContactsPath = "/api/v1/administrator/promotion-contacts";

export const valeria: AdminPromotionContactDto = {
  id: "7c000000-0000-5000-8000-000000000001",
  kind: "former_client",
  name: "Valeria Quiroga",
  email: "valeria@example.com",
  phone: "+591 70011005",
  since: "2026-10-19T20:00:00.000Z",
  consentedAt: "2026-10-19T20:00:00.000Z",
};

export const daniela: AdminPromotionContactDto = {
  id: "7c000000-0000-5000-8000-000000000002",
  kind: "former_client",
  name: "Daniela Rojas",
  email: "daniela@example.com",
  phone: null,
  // 23:30 on 16 October in Bolivia, already the 17th in UTC.
  since: "2026-10-17T03:30:00.000Z",
  consentedAt: "2026-10-17T03:30:00.000Z",
};

// FIX-060: a live Client, listed from the day she joined.
export const paula: AdminPromotionContactDto = {
  id: "7c000000-0000-5000-8000-000000000003",
  kind: "client",
  name: "Paula Antelo",
  email: "paula@example.com",
  phone: "+591 76302118",
  since: "2026-10-08T15:00:00.000Z",
  consentedAt: "2026-10-08T15:00:00.000Z",
};

export const contactPage = (
  items: AdminPromotionContactDto[],
  totalItems = items.length,
): AdminPromotionContactPageDto => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems,
});
