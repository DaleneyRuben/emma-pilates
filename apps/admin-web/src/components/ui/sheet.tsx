import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { useRef, type ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { BodyScrollLock } from "./body-scroll-lock";

// Side panels (408px) and their narrow-browser sheets, plus the sidebar
// drawer, all share the Dialog behavior: scrim, focus trap, Esc to close.
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;

// design/README.md, side-panel header (and follow-up 21's viewer): a 30px
// square, 1px Borde on Superficie, whose border turns Palo de rosa on hover.
export const closeButtonClass =
  "inline-flex size-[30px] items-center justify-center rounded-control border border-borde bg-superficie text-texto-tenue hover:border-primario hover:text-texto focus-visible:shadow-foco";

const sheetVariants = cva(
  "fixed z-50 flex flex-col bg-blanco text-texto shadow-panel outline-none",
  {
    variants: {
      side: {
        left: "inset-y-0 left-0 w-[236px] max-w-[85vw] border-r border-borde",
        right: "inset-y-0 right-0 w-[408px] max-w-full border-l border-borde",
        bottom:
          "inset-x-0 bottom-0 max-h-[85svh] rounded-t-marco border-t border-borde",
        full: "inset-0",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants> & {
    closeLabel?: string;
    hideClose?: boolean;
  };

export function SheetContent({
  className,
  children,
  side,
  closeLabel = "Cerrar",
  hideClose = false,
  ...props
}: SheetContentProps) {
  const content = useRef<HTMLDivElement>(null);

  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim" />
      <SheetPrimitive.Content
        ref={content}
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        // WEB-036: a dialog opened over the sheet (the enlarged receipt) is
        // portaled outside it and becomes Radix's highest layer only in an
        // effect after it is painted and focused; an Escape pressed inside it
        // in that window would otherwise close the sheet, and the dialog
        // with it. Escape then belongs to the dialog it was pressed in.
        onEscapeKeyDown={(event) => {
          const dialog =
            event.target instanceof Element
              ? event.target.closest('[role="dialog"]')
              : null;
          if (dialog !== null && dialog !== content.current) {
            event.preventDefault();
          }
        }}
        {...props}
      >
        <BodyScrollLock />
        {children}
        {hideClose ? null : (
          <SheetPrimitive.Close
            className={cn("absolute top-3 right-3", closeButtonClass)}
            aria-label={closeLabel}
          >
            <X size={16} strokeWidth={1.6} aria-hidden="true" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 px-5 pt-5 pb-3", className)}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      tabIndex={-1}
      className={cn(
        "font-serif text-titulo-panel text-texto outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("text-nota text-texto-tenue", className)}
      {...props}
    />
  );
}
