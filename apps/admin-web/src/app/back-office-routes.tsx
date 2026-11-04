import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { cashCloseSearchSchema } from "../back-office/cash-close/cash-close-search";
import { expenseSearchSchema } from "../back-office/expenses/expense-search";
import { payrollSearchSchema } from "../back-office/payroll/payroll-search";
import { boliviaMonth } from "../lib/bolivia-time";
import { withdrawalSearchSchema } from "../back-office/supplies/supply-search";
import {
  listSearchSchema,
  optionalSearch,
} from "../components/table/pagination";
import { clientSearchSchema, staffSearchSchema } from "../people/people-search";
import { paymentSearchSchema } from "../payments/payment-search";
import { authenticatedRoute } from "./root-routes";

// The sidebar's Back Office pages (WEB-004, WEB-005, WEB-007). Each page is
// its own chunk, loaded when its route is matched or preloaded on intent.
const clientsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/clientas",
  validateSearch: optionalSearch(clientSearchSchema),
  component: lazyRouteComponent(
    () => import("../people/clients/clients-route"),
    "ClientsRoute",
  ),
});

// AW21 (BKM-015): the campaign grant, opened from Clientes, not its own
// sidebar entry.
const campaignRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/promociones/clases-de-campana",
  component: lazyRouteComponent(
    () => import("../campaigns/campaign-route"),
    "CampaignRoute",
  ),
});

const contactAlertsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/clientas/para-contactar",
  component: lazyRouteComponent(
    () => import("../people/contact-alerts/contact-alerts-route"),
    "ContactAlertsRoute",
  ),
});

const freezesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/clientas/congelamientos",
  component: lazyRouteComponent(
    () => import("../oversight/freezes/freezes-route"),
    "FreezesRoute",
  ),
});

const staffRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/estudio/personal",
  validateSearch: optionalSearch(staffSearchSchema),
  component: lazyRouteComponent(
    () => import("../people/staff/staff-route"),
    "StaffRoute",
  ),
});

const paymentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dinero/pagos",
  validateSearch: optionalSearch(paymentSearchSchema),
  component: lazyRouteComponent(
    () => import("../payments/payments-route"),
    "PaymentsRoute",
  ),
});

// AW151: the selected Branch's Cash Closes, one Bolivia month at a time.
const cashClosesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dinero/caja",
  validateSearch: optionalSearch(cashCloseSearchSchema),
  component: lazyRouteComponent(
    () => import("../back-office/cash-close/cash-closes-route"),
    "CashClosesRoute",
  ),
});

const suppliesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/estudio/insumos",
  validateSearch: optionalSearch(listSearchSchema),
  component: lazyRouteComponent(
    () => import("../back-office/supplies/supplies-route"),
    "SuppliesRoute",
  ),
});

// AW31 is a view of Insumos, not a sidebar entry of its own.
const withdrawalsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/estudio/insumos/retiros",
  validateSearch: optionalSearch(withdrawalSearchSchema),
  component: lazyRouteComponent(
    () => import("../back-office/supplies/withdrawals-route"),
    "WithdrawalsRoute",
  ),
});

const payStatementsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dinero/sueldos",
  validateSearch: (search: Record<string, unknown>) => ({
    month: typeof search.month === "string" ? search.month : boliviaMonth(),
  }),
  component: lazyRouteComponent(
    () => import("../back-office/payroll/pay-statements-route"),
    "PayStatementsRoute",
  ),
});

// AW37 (BKO-004): one Branch's Equipment on one page, so no list search.
const equipmentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/estudio/equipos",
  component: lazyRouteComponent(
    () => import("../back-office/equipment/equipment-page"),
    "EquipmentPage",
  ),
});

const payrollRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dinero/sueldos/pagados",
  validateSearch: optionalSearch(payrollSearchSchema),
  component: lazyRouteComponent(
    () => import("../back-office/payroll/payroll-route"),
    "PayrollRoute",
  ),
});

const expensesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dinero/gastos",
  validateSearch: optionalSearch(expenseSearchSchema),
  component: lazyRouteComponent(
    () => import("../back-office/expenses/expenses-route"),
    "ExpensesRoute",
  ),
});

export const backOfficeRoutes = [
  clientsRoute,
  campaignRoute,
  contactAlertsRoute,
  freezesRoute,
  paymentsRoute,
  cashClosesRoute,
  suppliesRoute,
  withdrawalsRoute,
  equipmentRoute,
  staffRoute,
  payrollRoute,
  payStatementsRoute,
  expensesRoute,
];
