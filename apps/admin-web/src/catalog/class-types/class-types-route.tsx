import { getRouteApi } from "@tanstack/react-router";
import { ClassTypesPage } from "./class-types-page";

const route = getRouteApi("/authenticated/catalogo/tipos-de-clase");

export function ClassTypesRoute() {
  const navigate = route.useNavigate();
  return (
    <ClassTypesPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
