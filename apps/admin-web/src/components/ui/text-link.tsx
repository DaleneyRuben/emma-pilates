import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/**
 * Follow-up 285: a link is always underlined, since with one ink the
 * underline is its only mark. On its own («Ver horario», «Volver») it is
 * `enlace` (14 · 700); inside a sentence or a row (`inline`) it takes the
 * size of the text around it, in 700. Hover thickens the underline and
 * never changes the colour (rule 6). `asChild` styles a router Link.
 */
export function TextLink({
  asChild = false,
  inline = false,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { asChild?: boolean; inline?: boolean }) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      type={asChild ? undefined : type}
      className={cn(
        inline ? "tipo-enlace-en-linea" : "tipo-enlace",
        "cursor-pointer text-left text-texto focus-visible:shadow-foco disabled:cursor-default",
        className,
      )}
      {...props}
    />
  );
}
