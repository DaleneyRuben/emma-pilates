import { http } from "msw";
import { apiUrl, jsonResponse } from "./msw";

export const branchesPath = "/api/v1/administrator/branches";

export const centro = {
  id: "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c001",
  name: "Centro",
  address: "Calle Ayacucho 245",
  archivedAt: null,
};
export const equipetrol = {
  id: "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c002",
  name: "Equipetrol",
  address: "Av. San Martín 1120",
  archivedAt: null,
};
export const norte = {
  id: "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c003",
  name: "Norte",
  address: "Av. Banzer, 4.º anillo",
  archivedAt: null,
};

export const page = <Item>(
  items: Item[],
  window: { page?: number; pageSize?: number; totalItems?: number } = {},
) => ({
  items,
  page: window.page ?? 1,
  pageSize: window.pageSize ?? 20,
  totalItems: window.totalItems ?? items.length,
});

// The shell's selector reads the active Branches once per session (AW34).
export const activeBranchesHandler = (branches = [centro, equipetrol, norte]) =>
  http.get(apiUrl(branchesPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("status") !== "active" || params.get("pageSize") !== "100") {
      return undefined;
    }
    return jsonResponse(page(branches, { pageSize: 100 }));
  });
