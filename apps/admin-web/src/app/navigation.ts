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
  | "/back-office/pagos-instructoras"
  | "/back-office/gastos"
  | "/back-office/categorias-de-gasto"
  | "/reporte"
  | "/promociones"
  | "/promociones/referidos"
  | "/promociones/creditos"
  | "/reglas-del-estudio";

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
  /** A dense list page (design system → List pages) with page-and-offset search. */
  list?: true;
  /**
   * A count beside the link (design system → Back Office): the transfers
   * waiting in Pagos, or the selected Branch's low-stock Supplies in the
   * warning tint beside Insumos.
   */
  badge?: "pendingPayments" | "lowStock";
  /**
   * Its sub-pages keep it marked: every page under it (AW31 is a view of
   * Insumos), or only the listed ones where siblings share its prefix
   * (AW35 under Promociones, beside Referidos and Créditos).
   */
  subPages?: true | readonly string[];
  /**
   * The page brings its own Branch selector with «Todas las sucursales»
   * (AW16), so the top bar shows a note instead of the shell's.
   */
  ownBranchFilter?: true;
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
        list: true,
      },
      {
        label: "Planes",
        to: "/catalogo/planes",
        screen: "AW04",
        list: true,
      },
      {
        label: "Sucursales",
        to: "/catalogo/sucursales",
        screen: "AW19",
        list: true,
      },
    ],
  },
  {
    label: "Back Office",
    items: [
      {
        label: "Clientes",
        to: "/back-office/clientes",
        screen: "AW21",
        list: true,
        studioWide: "los clientes son del estudio, no de una sede.",
      },
      {
        label: "Pagos",
        to: "/back-office/pagos",
        screen: "AW28",
        list: true,
        badge: "pendingPayments",
        studioWide: "los pagos son del estudio, no de una sede.",
      },
      {
        label: "Insumos",
        to: "/back-office/insumos",
        screen: "AW08",
        list: true,
        badge: "lowStock",
        subPages: true,
      },
      {
        label: "Evaluaciones nutricionales",
        to: "/back-office/evaluaciones-nutricionales",
        screen: "AW25",
        list: true,
      },
      {
        label: "Personal",
        to: "/back-office/personal",
        screen: "AW23",
        list: true,
      },
      {
        label: "Pagos a instructoras",
        to: "/back-office/pagos-instructoras",
        screen: "AW11",
        studioWide: "los pagos a instructoras son del estudio, no de una sede.",
      },
      {
        label: "Nómina",
        to: "/back-office/nomina",
        screen: "AW11",
        list: true,
        studioWide: "la nómina es del estudio, no de una sede.",
      },
      {
        label: "Gastos",
        to: "/back-office/gastos",
        screen: "AW13",
        list: true,
      },
      {
        label: "Categorías de gasto",
        to: "/back-office/categorias-de-gasto",
        screen: "AW15",
        list: true,
        studioWide: "las categorías de gasto son del estudio, no de una sede.",
      },
    ],
  },
  {
    items: [
      {
        label: "Reporte",
        to: "/reporte",
        screen: "AW16",
        ownBranchFilter: true,
      },
    ],
  },
  {
    label: "Promociones",
    items: [
      // AW17 is the one list drawn as cards, unpaged, because its order is
      // what the page edits.
      {
        label: "Promociones",
        to: "/promociones",
        screen: "AW17",
        subPages: ["/promociones/contactos"],
      },
      {
        label: "Referidos",
        to: "/promociones/referidos",
        screen: "AW26",
        list: true,
        studioWide: "los referidos son del estudio, no de una sede.",
      },
      {
        label: "Créditos",
        to: "/promociones/creditos",
        screen: "AW27",
        list: true,
        studioWide: "los créditos son del estudio, no de una sede.",
      },
    ],
  },
];

/**
 * Pages the account menu (AW33) opens rather than the sidebar; they still
 * name the browser tab and the Branch selector's studio-wide note.
 */
export const accountMenuItems: readonly NavigationItem[] = [
  {
    label: "Reglas del estudio",
    to: "/reglas-del-estudio",
    screen: "AW36",
    studioWide: "las reglas son del estudio, no de una sede.",
  },
];

export const navigationItems: readonly NavigationItem[] = [
  ...navigationGroups.flatMap((group) => group.items),
  ...accountMenuItems,
];

export const findNavigationItem = (
  pathname: string,
): NavigationItem | undefined =>
  navigationItems.find((item) => item.to === pathname);

/** The entry a page belongs to, its sub-pages (AW31 under Insumos) included. */
export const navigationItemOf = (
  pathname: string,
): NavigationItem | undefined =>
  findNavigationItem(pathname) ??
  navigationItems.find((item) =>
    item.subPages === true
      ? pathname.startsWith(`${item.to}/`)
      : (item.subPages?.includes(pathname) ?? false),
  );
