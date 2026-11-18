import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { emptyRevenueReport, revenueReportPath } from "../test/report-fixtures";
import { RevenueSection } from "./revenue-section";

const renderSection = (branchName?: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RevenueSection branchName={branchName} />
    </QueryClientProvider>,
  );
};

// Walkthrough finding 107 (g): the accrued revenue is the studio's, so beside
// one Branch's report it says so instead of passing for that Branch's.
describe("STU-002 Ingreso devengado beside one Branch", () => {
  useMockServer();
  beforeEach(() => {
    server.use(
      http.get(apiUrl(revenueReportPath), () =>
        jsonResponse({ ...emptyRevenueReport, cashCentavos: 673_950 }),
      ),
    );
  });

  it("labels the figures as the whole studio's when a Branch is chosen", async () => {
    renderSection("Achumani");

    const section = await screen.findByRole("region", {
      name: "Ingreso devengado",
    });
    expect(
      await within(section).findByText(
        "Todo el estudio, no solo Achumani: no se separa por sucursal.",
      ),
    ).toBeVisible();
  });

  it("adds no label for every Branch", async () => {
    renderSection();

    expect(await screen.findByText("Bs 6.739,50")).toBeVisible();
    expect(screen.queryByText(/Todo el estudio/)).toBeNull();
  });
});
