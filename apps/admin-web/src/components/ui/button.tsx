import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// Follow-up 225 §4 (the admin boards' .btn): Primary in Palo de rosa,
// Secondary on Rosa tinte with a Rosa enlace label, Text with no underline,
// Destructive on its pale ground; no borders and no shadows. One solid
// (primary) button per view.
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-boton font-semibold transition-colors focus-visible:shadow-foco disabled:pointer-events-none disabled:bg-deshabilitado disabled:text-deshabilitado-texto disabled:shadow-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primario text-blanco hover:bg-primario-hover focus-visible:shadow-foco-solido active:bg-primario-presionado",
        secondary:
          "bg-primario-tinte text-primario-profundo hover:bg-rosa-empolvado/40",
        link: "h-auto px-0 text-primario-profundo hover:text-primario-presionado",
        neutral: "bg-lino text-texto hover:bg-primario-tinte",
        destructive: "bg-error-tinte text-error hover:text-error-texto",
        ghost: "text-primario-profundo hover:bg-lino",
      },
      size: {
        sm: "h-[36px] rounded-tarjeta px-3.5 text-celda",
        md: "h-[44px] px-[18px] text-cuerpo",
        lg: "h-[52px] px-5 text-cuerpo",
        icon: "size-[44px] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Follow-up 93: a request this button sent is in flight. */
    busy?: boolean;
  };

// Busy (follow-up 93): fill, border, and size stay; a 16 px ring in the
// label's colour turns where the label was (kept invisibly for width);
// clicks and Enter are swallowed so the request is never sent twice. It is
// not `disabled` (even when the caller also disables it), whose grey reads
// as unavailable.
export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  busy = false,
  disabled,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  const working = busy && !asChild;

  return (
    <Component
      data-slot="button"
      type={asChild ? undefined : type}
      className={cn(
        buttonVariants({ variant, size, className }),
        working && "relative",
      )}
      disabled={working ? false : disabled}
      aria-busy={working ? true : undefined}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        if (working) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...props}
    >
      {working ? (
        <>
          <span className="invisible inline-flex items-center gap-2">
            {children}
          </span>
          <span
            data-slot="spinner"
            aria-hidden="true"
            className="absolute inset-0 m-auto size-[16px] animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-current/35 border-t-current"
          />
        </>
      ) : (
        children
      )}
    </Component>
  );
}
