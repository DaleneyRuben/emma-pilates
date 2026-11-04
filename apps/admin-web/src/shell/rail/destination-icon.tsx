import {
  BarChart3,
  CalendarDays,
  Banknote,
  House,
  Megaphone,
  MessagesSquare,
  Settings,
  Store,
  Users,
  type LucideProps,
} from "lucide-react";
import type { DestinationIcon as Icon } from "../../app/navigation";

// The boards draw Material Symbols (home, calendar_month, group, campaign,
// forum, payments, storefront, bar_chart, settings); the admin web keeps the
// line icons it already ships, one for each.
const icons = {
  inicio: House,
  horario: CalendarDays,
  clientas: Users,
  promociones: Megaphone,
  comentarios: MessagesSquare,
  dinero: Banknote,
  estudio: Store,
  informes: BarChart3,
  ajustes: Settings,
} satisfies Record<Icon, unknown>;

export function DestinationIcon({
  icon,
  ...props
}: { icon: Icon } & LucideProps) {
  const Component = icons[icon];
  return <Component strokeWidth={1.6} aria-hidden="true" {...props} />;
}
