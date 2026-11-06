import {
  screen,
  type BoundFunctions,
  type queries,
} from "@testing-library/react";

type Queries = BoundFunctions<typeof queries>;

// Follow-ups 94 and 107 (WEB-045): a loading area is one status named with
// the page's Spanish label, holding only the studio's logo and no text.
function expectLogoOnly(status: HTMLElement) {
  expect(status.querySelector("img.carga-logo")).toHaveAttribute(
    "src",
    "/emma-logo.png",
  );
  expect(status).toHaveTextContent("");
  return status;
}

export function expectBrandedLoading(name: string, within: Queries = screen) {
  return expectLogoOnly(within.getByRole("status", { name }));
}

export async function findBrandedLoading(
  name: string,
  within: Queries = screen,
) {
  return expectLogoOnly(await within.findByRole("status", { name }));
}
