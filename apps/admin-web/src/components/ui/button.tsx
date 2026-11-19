import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// FIX-089 (BotonA, palette B): Primary is the one solid fill, Rosa profundo
// with a Crema label, one per screen. Secondary, neutral and outline are the
// same quiet button: Crema with a 1.5 px Rosa profundo border. Destructive
// looks like Secondary (never red); the action asks first (ConfirmDialog).
// Disabled is Crema with an Arcilla border and a weight-500 label. A small
// button is 44 px tall at phone width (audit 8.2) and 36 px from md up.
const quiet =
  "border-[1.5px] border-rosa-profundo bg-crema text-rosa-profundo hover:bg-rubor";
const bare = "disabled:border-0 disabled:bg-transparent disabled:font-semibold";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-boton font-semibold transition-colors focus-visible:shadow-foco disabled:pointer-events-none disabled:border-[1.5px] disabled:border-arcilla disabled:bg-crema disabled:font-medium disabled:text-rosa-profundo disabled:shadow-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-rosa-profundo text-crema focus-visible:shadow-foco-solido",
        secondary: quiet,
        neutral: quiet,
        outline: quiet,
        destructive: quiet,
        // FIX-088: a disabled text link stays text, never a block.
        link: `h-auto px-0 text-rosa-profundo underline-offset-4 hover:underline ${bare}`,
        ghost: `text-rosa-profundo hover:bg-rubor ${bare}`,
      },
      size: {
        sm: "h-[44px] px-3.5 text-celda md:h-[36px]",
        md: "h-[44px] px-[18px] text-cuerpo",
        lg: "h-[52px] px-5 text-base",
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
