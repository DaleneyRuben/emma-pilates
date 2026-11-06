import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { PersonAvatar } from "./person-avatar";
import { StaffFace } from "./staff-face";

const jpegBytes = Uint8Array.from([255, 216, 255, 224]);

const wrapper = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

// FIX-041: a Staff Member's photo, or her two initials while she has none.
describe("PersonAvatar", () => {
  it("shows the initials on the tint without a photo", async () => {
    await render(<PersonAvatar name="Andrea Suárez" photoUri={null} size={36} />);

    expect(screen.getByText("AS")).toBeOnTheScreen();
  });

  it("shows the photo centre-cropped by the circle", async () => {
    await render(
      <PersonAvatar name="Daniela Ortiz" photoUri="data:image/jpeg;base64,AA==" size={72} />,
    );

    expect(screen.getByLabelText("Foto de Daniela Ortiz")).toBeOnTheScreen();
    expect(screen.queryByText("DO")).toBeNull();
  });
});

describe("StaffFace", () => {
  it("loads the thumbnail by asset through the API fetcher", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        new Response(jpegBytes, { headers: { "Content-Type": "image/jpeg" }, status: 200 }),
      );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await render(
      <StaffFace
        fetcher={fetcher}
        name="Daniela Ortiz"
        photo={{ imageAssetId: "asset-1" }}
        size={20}
      />,
      { wrapper: wrapper(client) },
    );

    await waitFor(() => expect(screen.getByLabelText("Foto de Daniela Ortiz")).toBeOnTheScreen());
    expect(fetcher).toHaveBeenCalledWith("/api/v1/staff-photos/asset-1?variant=thumbnail");
  });

  it("keeps the initials and fetches nothing without a photo or when the image fails", async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await render(<StaffFace fetcher={fetcher} name="Andrea Suárez" photo={null} size={20} />, {
      wrapper: wrapper(client),
    });
    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(fetcher).not.toHaveBeenCalled();

    await render(
      <StaffFace
        fetcher={fetcher}
        name="Emma Vargas"
        photo={{ imageAssetId: "gone" }}
        size={36}
        variant="display"
      />,
      { wrapper: wrapper(client) },
    );
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith("/api/v1/staff-photos/gone?variant=display"),
    );
    expect(screen.getByText("EV")).toBeOnTheScreen();
  });
});
