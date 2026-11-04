import { http } from "msw";
import { apiUrl, jsonResponse } from "./msw";

// The Para contactar count the rail and Inicio read (AW39).
export const contactAlertsCount = (totalItems: number) =>
  http.get(apiUrl("/api/v1/administrator/contact-alerts"), () =>
    jsonResponse({ items: [], totalItems }),
  );
