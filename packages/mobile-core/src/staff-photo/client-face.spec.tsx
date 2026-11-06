import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ClientFace } from "./client-face";

const jpegBytes = Uint8Array.from([255, 216, 255, 224]);
const wrapper = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

// Finding n.º 30: the staff see a Client's photo wherever she appears.
describe("ClientFace", () => {
  it("loads her thumbnail by asset through the staff route", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        new Response(jpegBytes, { headers: { "Content-Type": "image/jpeg" }, status: 200 }),
      );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await render(
      <ClientFace
        fetcher={fetcher}
        name="Mariana Quiroga"
        photo={{ imageAssetId: "asset-9" }}
        size={36}
      />,
      { wrapper: wrapper(client) },
    );

    await waitFor(() => expect(screen.getByLabelText("Foto de Mariana Quiroga")).toBeOnTheScreen());
    expect(fetcher).toHaveBeenCalledWith("/api/v1/client-photos/asset-9?variant=thumbnail");
  });

  it("keeps her initials without a photo", async () => {
    const fetcher = jest.fn();
    const client = new QueryClient();

    await render(<ClientFace fetcher={fetcher} name="Mariana Quiroga" photo={null} size={36} />, {
      wrapper: wrapper(client),
    });

    expect(screen.getByText("MQ")).toBeOnTheScreen();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
