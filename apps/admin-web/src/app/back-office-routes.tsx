import { createRoute } from "@tanstack/react-router";
import { ExpenseCategoriesPage } from "../back-office/expenses/categories-page";
import { ExpensesPage } from "../back-office/expenses/expenses-page";
import { expenseSearchSchema } from "../back-office/expenses/expense-search";
import { PayrollPage } from "../back-office/payroll/payroll-page";
import { payrollSearchSchema } from "../back-office/payroll/payroll-search";
import { SuppliesPage } from "../back-office/supplies/supplies-page";
import { withdrawalSearchSchema } from "../back-office/supplies/supply-search";
import { WithdrawalsPage } from "../back-office/supplies/withdrawals-page";
import { listSearchSchema } from "../components/table/pagination";
import { ClientsPage } from "../people/clients/clients-page";
import { clientSearchSchema, staffSearchSchema } from "../people/people-search";
import { StaffPage } from "../people/staff/staff-page";
import { PaymentsPage } from "../payments/payments-page";
import { paymentSearchSchema } from "../payments/payment-search";
import { authenticatedRoute } from "./root-routes";

// The sidebar's Back Office pages (WEB-004, WEB-005, WEB-007).
const clientsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/clientes",
  validateSearch: clientSearchSchema,
  component: function ClientsRoute() {
    const navigate = clientsRoute.useNavigate();
    return (
      <ClientsPage
        search={clientsRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

const staffRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/personal",
  validateSearch: staffSearchSchema,
  component: function StaffRoute() {
    const navigate = staffRoute.useNavigate();
    return (
      <StaffPage
        search={staffRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

const paymentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/pagos",
  validateSearch: paymentSearchSchema,
  component: function PaymentsRoute() {
    const navigate = paymentsRoute.useNavigate();
    return (
      <PaymentsPage
        search={paymentsRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

const suppliesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/insumos",
  validateSearch: listSearchSchema,
  component: function SuppliesRoute() {
    const navigate = suppliesRoute.useNavigate();
    return (
      <SuppliesPage
        search={suppliesRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

// AW31 is a view of Insumos, not a sidebar entry of its own.
const withdrawalsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/insumos/retiros",
  validateSearch: withdrawalSearchSchema,
  component: function WithdrawalsRoute() {
    const navigate = withdrawalsRoute.useNavigate();
    return (
      <WithdrawalsPage
        search={withdrawalsRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

const payrollRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/nomina",
  validateSearch: payrollSearchSchema,
  component: function PayrollRoute() {
    const navigate = payrollRoute.useNavigate();
    return (
      <PayrollPage
        search={payrollRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

const expensesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/gastos",
  validateSearch: expenseSearchSchema,
  component: function ExpensesRoute() {
    const navigate = expensesRoute.useNavigate();
    return (
      <ExpensesPage
        search={expensesRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

// AW15 lists every label on one page, so it keeps only the list search.
const expenseCategoriesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/categorias-de-gasto",
  validateSearch: listSearchSchema,
  component: ExpenseCategoriesPage,
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
