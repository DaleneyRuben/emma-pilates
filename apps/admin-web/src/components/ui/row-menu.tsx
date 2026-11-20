import { MoreHorizontal } from "lucide-react";
import { DropdownMenu } from "radix-ui";

export type RowMenuItem = {
  label: string;
  onSelect: () => void;
};

/**
 * FIX-091 (W3 B, W4 B): a table row's secondary actions behind «⋯», so the
 * row itself stays clean. Draws nothing when the row has no action.
 */
export function RowMenu({
  label,
  items,
}: {
  /** The trigger's accessible name, naming the row («Acciones de …»). */
  label: string;
  items: readonly RowMenuItem[];
}) {
  if (items.length === 0) return null;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex size-[44px] items-center justify-center rounded-[10px] text-texto inset-ring inset-ring-borde hover:bg-superficie-hundida focus-visible:shadow-foco md:size-[36px]"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          onClick={(event) => event.stopPropagation()}
          className="z-50 min-w-[180px] rounded-[18px] bg-superficie p-2 text-texto shadow-popover"
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              onSelect={item.onSelect}
              className="flex min-h-[40px] cursor-pointer items-center rounded-control px-3 tipo-compacto outline-none data-highlighted:bg-primario data-highlighted:text-sobre-primario"
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
