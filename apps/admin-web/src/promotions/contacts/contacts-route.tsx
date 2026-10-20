import { getRouteApi } from "@tanstack/react-router";
import { ContactsPage } from "./contacts-page";

const route = getRouteApi("/authenticated/promociones/contactos");

export function ContactsRoute() {
  const navigate = route.useNavigate();
  return (
    <ContactsPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
