import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// Design system → Buttons. One solid (primary) button per view.
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors focus-visible:border-primario focus-visible:shadow-foco disabled:pointer-events-none disabled:border-transparent disabled:bg-deshabilitado disabled:text-deshabilitado-texto disabled:shadow-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primario text-blanco shadow-boton hover:bg-primario-hover focus-visible:shadow-foco-solido active:bg-primario-presionado",
        secondary:
          "border border-primario bg-transparent text-primario hover:bg-tinte-suave",
        link: "h-auto px-0 text-primario underline-offset-4 hover:text-primario-presionado hover:underline",
        neutral:
          "border border-borde-fuerte bg-superficie text-texto hover:border-primario",
        destructive:
          "border border-error bg-transparent text-error hover:bg-error/10 hover:text-error-texto",
        ghost: "text-texto-secundario hover:bg-hover-fila hover:text-texto",
      },
      size: {
        sm: "h-[30px] px-3 text-nota",
        md: "h-[38px] px-4 text-cuerpo",
        lg: "h-[46px] px-5 text-cuerpo",
        icon: "size-[38px] p-0",
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
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";

  return (
    <Component
      data-slot="button"
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
