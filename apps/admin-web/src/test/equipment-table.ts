import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

/** FIX-091 (W10 A): opens a type's row in the Equipos table. */
export const typeDetail = async (user: UserEvent, typeName: string) => {
  await user.click(
    await screen.findByRole("button", { name: `Ver ${typeName}` }),
  );
  return (await screen.findByRole("region", {
    name: new RegExp(`^${typeName} ·`),
  })) as HTMLElement;
};
