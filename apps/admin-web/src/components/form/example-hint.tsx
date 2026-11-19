import type { ReactNode } from "react";

/**
 * FIX-089 (FormB): an example never sits in a placeholder, where it reads as
 * a value already filled in; it goes under the field as «Ej.: …», on its
 * own line above any other help the field has.
 */
export function ExampleHint({
  example,
  children,
}: {
  example: string;
  children?: ReactNode;
}) {
  return (
    <>
      <span className="block">{`Ej.: ${example}`}</span>
      {children === undefined || children === null || children === "" ? null : (
        <span className="block">{children}</span>
      )}
    </>
  );
}
