import { screen } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse } from "./msw";
import {
  emma,
  paolaMember,
  rita,
  staffMembersPath,
  staffPage,
  valentina,
} from "./people-fixtures";
import { renderAdmin } from "./render-admin";

// Shared AW24 «Editar miembro» helpers: the recorded requests, the Personal
// list, and opening a member's panel.
export const sent: { method: string; path: string; body: unknown }[] = [];
export const memberPath = (id: string) => `${staffMembersPath}/${id}`;
export const record =
  (respond: () => Response) =>
  async ({ request }: { request: Request }) => {
    const text = await request.text();
    sent.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: text === "" ? null : (JSON.parse(text) as unknown),
    });
    return respond();
  };

export const list = () =>
  http.get(apiUrl(staffMembersPath), () =>
    jsonResponse(staffPage([emma, paolaMember, rita, valentina])),
  );

export const openMember = async (name: string) => {
  const rendered = renderAdmin("/back-office/personal");
  await rendered.user.click(await screen.findByRole("button", { name }));
  return {
    ...rendered,
    panel: await screen.findByRole("dialog", { name: "Editar miembro" }),
  };
};
