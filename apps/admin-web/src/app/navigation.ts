import type { AdminRole } from "../session/admin-role";

/**
 * The admin web's structure as follow-up 232 approves it: an icon rail with
 * nine destinations, each destination's pages as tabs under its title, and
 * a tab's own views (Sueldos, Gastos, Insumos) as a switch under the tabs.
 * Every page is a typed route; never "Descuentos" (ADR-0007).
 */
export type AdminPath =
  | "/"
  | "/horario"
  | "/horario/nutricion"
  | "/clientas"
  | "/clientas/para-contactar"
  | "/clientas/congelamientos"
  | "/clientas/fundadoras"
  | "/promociones"
  | "/promociones/clases-de-campana"
  | "/promociones/referidos"
  | "/promociones/contactos"
  | "/comentarios"
  | "/dinero/pagos"
  | "/dinero/caja"
  | "/dinero/sueldos"
  | "/dinero/sueldos/pagados"
  | "/dinero/gastos"
  | "/estudio/personal"
  | "/estudio/insumos"
  | "/estudio/insumos/retiros"
  | "/estudio/equipos"
  | "/informes"
  | "/informes/dinero"
  | "/informes/simulador"
  | "/ajustes/tipos-de-clase"
  | "/ajustes/planes"
  | "/ajustes/sucursales"
  | "/ajustes/reglas-del-estudio";

export type NavigationItem = {
  /** The tab's or view's label, as the boards in design/v2/admin draw it. */
  label: string;
  to: AdminPath;
  /**
   * A studio-wide page: the top bar shows «Todo el estudio» instead of the
   * Branch selector (follow-up 233, «Rules the boards follow»).
   */
  studioWide?: true;
  /** A dense list page (design system → List pages) with page-and-offset search. */
  list?: true;
  /** A count beside the tab, also summed onto its destination in the rail. */
  badge?: "pendingPayments" | "lowStock" | "contactAlerts";
  /**
   * The tab's other views, drawn after it (named `viewLabel`) as a switch
   * under the tabs; each view keeps the tab marked.
   */
  views?: readonly NavigationItem[];
  viewLabel?: string;
  /**
   * The page brings its own Branch selector with «Todas las sucursales»
   * (AW16), so the top bar shows a note instead of the shell's.
   */
  ownBranchFilter?: true;
  /** Open to the Coordinator too (ADR-0102): operations, never money. */
  coordinator?: true;
};

export type DestinationIcon =
  | "inicio"
  | "horario"
  | "clientas"
  | "promociones"
  | "comentarios"
  | "dinero"
  | "estudio"
  | "informes"
  | "ajustes";

export type Destination = {
  label: string;
  icon: DestinationIcon;
  /** Its pages, drawn as tabs when more than one is open to the Role. */
  tabs: readonly NavigationItem[];
};

// The Fundadoras tab stands in until Fundadora becomes a filter on Todas
// (WEB-040).
export const destinations: readonly Destination[] = [
  {
    label: "Inicio",
    icon: "inicio",
    tabs: [{ label: "Inicio", to: "/", coordinator: true }],
  },
  {
    label: "Horario",
    icon: "horario",
    tabs: [
      { label: "Clases", to: "/horario", coordinator: true },
      { label: "Nutrición", to: "/horario/nutricion", list: true },
    ],
  },
  {
    label: "Clientas",
    icon: "clientas",
    tabs: [
      {
        label: "Todas",
        to: "/clientas",
        list: true,
        studioWide: true,
        coordinator: true,
      },
      {
        label: "Para contactar",
        to: "/clientas/para-contactar",
        studioWide: true,
        badge: "contactAlerts",
        coordinator: true,
      },
      {
        label: "Congelamientos",
        to: "/clientas/congelamientos",
        list: true,
        studioWide: true,
      },
      {
        label: "Fundadoras",
        to: "/clientas/fundadoras",
        list: true,
        studioWide: true,
      },
    ],
  },
  {
    label: "Promociones",
    icon: "promociones",
    tabs: [
      // AW17 is the one list drawn as cards, unpaged, because its order is
      // what the page edits.
      { label: "Carrusel", to: "/promociones", studioWide: true },
      {
        label: "Clases de campaña",
        to: "/promociones/clases-de-campana",
        studioWide: true,
      },
      {
        label: "Referidos",
        to: "/promociones/referidos",
        list: true,
        studioWide: true,
      },
      { label: "Contactos", to: "/promociones/contactos", studioWide: true },
    ],
  },
  {
    label: "Comentarios",
    icon: "comentarios",
    // AW38 (REL-012): «Enviar comentarios» from both apps.
    tabs: [
      {
        label: "Comentarios",
        to: "/comentarios",
        list: true,
        studioWide: true,
      },
    ],
  },
  {
    label: "Dinero",
    icon: "dinero",
    tabs: [
      {
        label: "Pagos",
        to: "/dinero/pagos",
        list: true,
        badge: "pendingPayments",
        studioWide: true,
      },
      { label: "Caja", to: "/dinero/caja" },
      {
        label: "Sueldos",
        to: "/dinero/sueldos",
        studioWide: true,
        viewLabel: "Por aprobar",
        views: [
          {
            label: "Pagados",
            to: "/dinero/sueldos/pagados",
            list: true,
            studioWide: true,
          },
        ],
      },
      {
        label: "Gastos",
        to: "/dinero/gastos",
        list: true,
      },
    ],
  },
  {
    label: "Estudio",
    icon: "estudio",
    tabs: [
      {
        label: "Personal",
        to: "/estudio/personal",
        list: true,
        studioWide: true,
        coordinator: true,
      },
      {
        label: "Insumos",
        to: "/estudio/insumos",
        list: true,
        badge: "lowStock",
        viewLabel: "Stock",
        views: [{ label: "Retiros del mes", to: "/estudio/insumos/retiros" }],
      },
      { label: "Equipos", to: "/estudio/equipos" },
    ],
  },
  {
    label: "Informes",
    icon: "informes",
    tabs: [
      { label: "El mes", to: "/informes", studioWide: true, coordinator: true },
      { label: "Dinero", to: "/informes/dinero", ownBranchFilter: true },
      { label: "Simulador", to: "/informes/simulador", studioWide: true },
    ],
  },
  {
    label: "Ajustes",
    icon: "ajustes",
    tabs: [
      {
        label: "Tipos de clase",
        to: "/ajustes/tipos-de-clase",
        list: true,
        studioWide: true,
      },
      { label: "Planes", to: "/ajustes/planes", list: true, studioWide: true },
      {
        label: "Sucursales",
        to: "/ajustes/sucursales",
        list: true,
        studioWide: true,
      },
      {
        label: "Reglas del estudio",
        to: "/ajustes/reglas-del-estudio",
        studioWide: true,
      },
    ],
  },
];

/** Where a page sits: its destination, its tab, and itself (a tab or a view). */
export type Place = {
  destination: Destination;
  tab: NavigationItem;
  page: NavigationItem;
};

const places: readonly Place[] = destinations.flatMap((destination) =>
  destination.tabs.flatMap((tab) =>
    [tab, ...(tab.views ?? [])].map((page) => ({ destination, tab, page })),
  ),
);

/** Every page once: each tab, then its other views. */
export const navigationItems: readonly NavigationItem[] = places.map(
  (place) => place.page,
);

export const placeOf = (pathname: string): Place | undefined =>
  places.find((place) => place.page.to === pathname);

export const findNavigationItem = (
  pathname: string,
): NavigationItem | undefined => placeOf(pathname)?.page;

/** The browser tab names the page: «Dinero · Pagos», or just «Inicio». */
export const pageTitleOf = (pathname: string): string | undefined => {
  const place = placeOf(pathname);
  if (place === undefined) return undefined;
  return place.destination.tabs.length === 1
    ? place.destination.label
    : `${place.destination.label} · ${place.page.label}`;
};

/**
 * The Administrator sees every page. Anyone else holds no money and sees
 * only what ADR-0102 opens to the Coordinator (BKO-010 widens it).
 */
const mayOpen = (item: NavigationItem, role: AdminRole): boolean =>
  role === "administrator" || item.coordinator === true;

/** The rail a Role sees: a destination with no open page is left out. */
export const destinationsFor = (role: AdminRole): readonly Destination[] =>
  destinations
    .map((destination) => ({
      ...destination,
      tabs: destination.tabs.filter((tab) => mayOpen(tab, role)),
    }))
    .filter((destination) => destination.tabs.length > 0);

/** Whether the Coordinator may open a page; the API refuses the rest. */
export const coordinatorMayOpen = (pathname: string): boolean => {
  const place = placeOf(pathname);
  return (
    place !== undefined &&
    mayOpen(place.tab, "coordinator") &&
    mayOpen(place.page, "coordinator")
  );
};

/**
 * The old sidebar's addresses (and the bare destination roots) and the page
 * each now opens, so bookmarks and emailed links keep working.
 */
export const movedPaths: Readonly<Record<string, AdminPath>> = {
  "/catalogo/tipos-de-clase": "/ajustes/tipos-de-clase",
  "/catalogo/planes": "/ajustes/planes",
  "/catalogo/sucursales": "/ajustes/sucursales",
  "/back-office/clientes": "/clientas",
  "/back-office/clientes/campana": "/promociones/clases-de-campana",
  "/back-office/para-contactar": "/clientas/para-contactar",
  "/back-office/fundadoras": "/clientas/fundadoras",
  "/back-office/congelamientos": "/clientas/congelamientos",
  "/back-office/pagos": "/dinero/pagos",
  "/back-office/caja": "/dinero/caja",
  "/back-office/insumos": "/estudio/insumos",
  "/back-office/insumos/retiros": "/estudio/insumos/retiros",
  "/back-office/equipos": "/estudio/equipos",
  "/back-office/evaluaciones-nutricionales": "/horario/nutricion",
  "/back-office/personal": "/estudio/personal",
  "/back-office/nomina": "/dinero/sueldos/pagados",
  "/back-office/pagos-instructoras": "/dinero/sueldos",
  "/back-office/pago-coordinadora": "/dinero/sueldos",
  "/dinero/sueldos/coordinadora": "/dinero/sueldos",
  "/back-office/gastos": "/dinero/gastos",
  "/back-office/categorias-de-gasto": "/dinero/gastos",
  "/dinero/gastos/categorias": "/dinero/gastos",
  "/reporte": "/informes/dinero",
  "/reporte/indicadores": "/informes",
  "/recomendaciones": "/informes",
  "/informes/recomendaciones": "/informes",
  "/simulador": "/informes/simulador",
  "/reglas-del-estudio": "/ajustes/reglas-del-estudio",
  "/dinero": "/dinero/pagos",
  "/estudio": "/estudio/personal",
  "/ajustes": "/ajustes/tipos-de-clase",
};
