import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { expenseSearchSchema } from "../back-office/expenses/expense-search";
import { payrollSearchSchema } from "../back-office/payroll/payroll-search";
import { withdrawalSearchSchema } from "../back-office/supplies/supply-search";
import { listSearchSchema } from "../components/table/pagination";
import { clientSearchSchema, staffSearchSchema } from "../people/people-search";
import { paymentSearchSchema } from "../payments/payment-search";
import { authenticatedRoute } from "./root-routes";

// The sidebar's Back Office pages (WEB-004, WEB-005, WEB-007). Each page is
// its own chunk, loaded when its route is matched or preloaded on intent.
const clientsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/clientes",
  validateSearch: clientSearchSchema,
  component: lazyRouteComponent(
    () => import("../people/clients/clients-route"),
    "ClientsRoute",
  ),
});

const staffRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/personal",
  validateSearch: staffSearchSchema,
  component: lazyRouteComponent(
    () => import("../people/staff/staff-route"),
    "StaffRoute",
  ),
});

const paymentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/pagos",
  validateSearch: paymentSearchSchema,
  component: lazyRouteComponent(
    () => import("../payments/payments-route"),
    "PaymentsRoute",
  ),
});

const suppliesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/insumos",
  validateSearch: listSearchSchema,
  component: lazyRouteComponent(
    () => import("../back-office/supplies/supplies-route"),
    "SuppliesRoute",
  ),
});

// AW31 is a view of Insumos, not a sidebar entry of its own.
const withdrawalsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/insumos/retiros",
  validateSearch: withdrawalSearchSchema,
  component: lazyRouteComponent(
    () => import("../back-office/supplies/withdrawals-route"),
    "WithdrawalsRoute",
  ),
});

const payrollRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/nomina",
  validateSearch: payrollSearchSchema,
  component: lazyRouteComponent(
    () => import("../back-office/payroll/payroll-route"),
    "PayrollRoute",
  ),
});

const expensesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/gastos",
  validateSearch: expenseSearchSchema,
  component: lazyRouteComponent(
    () => import("../back-office/expenses/expenses-route"),
    "ExpensesRoute",
  ),
});

// AW15 lists every label on one page, so it keeps only the list search.
const expenseCategoriesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/categorias-de-gasto",
  validateSearch: listSearchSchema,
  component: lazyRouteComponent(
    () => import("../back-office/expenses/categories-page"),
    "ExpenseCategoriesPage",
  ),
});

export const backOfficeRoutes = [
  clientsRoute,
  paymentsRoute,
  suppliesRoute,
  withdrawalsRoute,
  staffRoute,
  payrollRoute,
  expensesRoute,
  expenseCategoriesRoute,
];
