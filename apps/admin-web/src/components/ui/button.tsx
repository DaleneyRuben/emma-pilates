import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// Rosa Emma (rw.py btn): Primary is the one solid fill, Rosa profundo with a
// white bold label. Secondary, neutral and outline are white with a 1.5 px
// Rosa profundo outline. Destructive looks like Secondary (never red); the
// action asks first (ConfirmDialog). Disabled is 50 with an Arcilla ring. A
// small button is 44 px tall at phone width (audit 8.2) and 36 px from md up.
// Follow-up 285: the label is `boton` (16) or `boton-chico` (14) and a link
// is `enlace`; hover never changes a colour or a weight (rules 4 and 6), so
// the primary fill stays 600 and lifts with a shadow.
const quiet =
  "bg-superficie text-texto inset-ring-[1.5px] inset-ring-primario hover:bg-superficie-hundida";
const bare = "disabled:bg-transparent disabled:inset-ring-0";
const boxed: (
  "primary" | "secondary" | "neutral" | "outline" | "destructive" | "ghost"
)[] = ["primary", "secondary", "neutral", "outline", "destructive", "ghost"];

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-boton transition-[background-color,box-shadow] focus-visible:shadow-foco disabled:pointer-events-none disabled:bg-superficie-hundida disabled:text-texto disabled:shadow-none disabled:inset-ring-[1.5px] disabled:inset-ring-borde-fuerte [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primario text-sobre-primario hover:shadow-destacado focus-visible:shadow-foco-solido",
        secondary: quiet,
        neutral: quiet,
        outline: quiet,
        destructive: quiet,
        // FIX-088: a disabled text link stays text, never a block.
        link: cn("h-auto px-0 text-texto", bare),
        ghost: cn("text-texto hover:bg-superficie-hundida", bare),
      },
      size: {
        sm: "h-[44px] px-3.5 md:h-[36px]",
        md: "h-[44px] px-[18px]",
        lg: "h-[48px] px-5",
        icon: "size-[44px] p-0",
      },
    },
    compoundVariants: [
      { variant: "link", class: "tipo-enlace" },
      { variant: boxed, size: "sm", class: "tipo-boton-chico" },
      { variant: boxed, size: ["md", "lg", "icon"], class: "tipo-boton" },
    ],
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
