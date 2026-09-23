/**
 * The admin sidebar as design follow-up 30 (§5) and the design system fix
 * it: Horario, Catálogo, Back Office, Reporte, Promociones, in this order,
 * and never "Descuentos" (ADR-0007). Every entry is a typed route.
 */
export type AdminPath =
  | "/"
  | "/catalogo/tipos-de-clase"
  | "/catalogo/planes"
  | "/catalogo/sucursales"
  | "/back-office/clientes"
  | "/back-office/pagos"
  | "/back-office/insumos"
  | "/back-office/evaluaciones-nutricionales"
  | "/back-office/personal"
  | "/back-office/nomina"
  | "/back-office/gastos"
  | "/back-office/categorias-de-gasto"
  | "/reporte"
  | "/promociones"
  | "/promociones/referidos"
  | "/promociones/creditos";

export type NavigationItem = {
  label: string;
  to: AdminPath;
  /** The design screen (docs/design/prompts/admin-web) this entry opens. */
  screen: string;
  /**
   * Set on the studio-wide pages where the Branch selector is shown but not
   * applied (AW34 frame 2); the text completes "Esta página no se filtra por
   * sucursal — …".
   */
  studioWide?: string;
};

export type NavigationGroup = {
  label?: string;
  items: readonly NavigationItem[];
};

export const navigationGroups: readonly NavigationGroup[] = [
  { items: [{ label: "Horario", to: "/", screen: "AW02" }] },
  {
    label: "Catálogo",
    items: [
      {
        label: "Tipos de clase",
        to: "/catalogo/tipos-de-clase",
        screen: "AW06",
      },
      { label: "Planes", to: "/catalogo/planes", screen: "AW04" },
      { label: "Sucursales", to: "/catalogo/sucursales", screen: "AW19" },
    ],
  },
  {
    label: "Back Office",
    items: [
      {
        label: "Clientes",
        to: "/back-office/clientes",
        screen: "AW21",
        studioWide: "los clientes son del estudio, no de una sede.",
      },
      {
        label: "Pagos",
        to: "/back-office/pagos",
        screen: "AW28",
        studioWide: "los pagos son del estudio, no de una sede.",
      },
      { label: "Insumos", to: "/back-office/insumos", screen: "AW08" },
      {
        label: "Evaluaciones nutricionales",
        to: "/back-office/evaluaciones-nutricionales",
        screen: "AW25",
      },
      { label: "Personal", to: "/back-office/personal", screen: "AW23" },
      {
        label: "Nómina",
        to: "/back-office/nomina",
        screen: "AW11",
        studioWide: "la nómina es del estudio, no de una sede.",
      },
      { label: "Gastos", to: "/back-office/gastos", screen: "AW13" },
      {
        label: "Categorías de gasto",
        to: "/back-office/categorias-de-gasto",
        screen: "AW15",
      },
    ],
  },
  { items: [{ label: "Reporte", to: "/reporte", screen: "AW16" }] },
  {
    label: "Promociones",
    items: [
      { label: "Promociones", to: "/promociones", screen: "AW17" },
      {
        label: "Referidos",
        to: "/promociones/referidos",
        screen: "AW26",
        studioWide: "los referidos son del estudio, no de una sede.",
      },
      {
        label: "Créditos",
        to: "/promociones/creditos",
        screen: "AW27",
        studioWide: "los créditos son del estudio, no de una sede.",
      },
    ],
  },
];

export const navigationItems: readonly NavigationItem[] =
  navigationGroups.flatMap((group) => group.items);

export const findNavigationItem = (
  pathname: string,
): NavigationItem | undefined =>
  navigationItems.find((item) => item.to === pathname);
