import { fireEvent, render, screen } from "@testing-library/react";
import { ClientPhoto } from "./client-photo";
import { StaffPhoto } from "./staff-photo";

// FIX-041 review: a photo replaced or removed elsewhere answers 404 to a list
// still holding its asset; the circle falls back to the initials instead of a
// broken image.
describe("photo circles", () => {
  it("fall back to the staff member's initials when her photo fails to load", () => {
    render(
      <StaffPhoto
        name="Daniela Ortiz"
        photo={{ imageAssetId: "11111111-1111-4111-8111-111111111111" }}
        size={40}
      />,
    );

    fireEvent.error(screen.getByAltText("Foto de Daniela Ortiz"));

    expect(screen.queryByAltText("Foto de Daniela Ortiz")).toBeNull();
    expect(screen.getByText("DO")).toBeInTheDocument();
  });

  it("fall back to the client's initials when her photo fails to load", () => {
    render(
      <ClientPhoto
        name="Mariana Quiroga"
        photo={{ imageAssetId: "22222222-2222-4222-8222-222222222222" }}
        size={40}
      />,
    );

    fireEvent.error(screen.getByAltText("Foto de Mariana Quiroga"));

    expect(screen.queryByAltText("Foto de Mariana Quiroga")).toBeNull();
    expect(screen.getByText("MQ")).toBeInTheDocument();
  });
});
