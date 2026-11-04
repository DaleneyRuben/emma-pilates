import { useAdminRole } from "../session/admin-role";
import { IndicatorsPage } from "./indicators-page";

// Only the Administrator discards a recommendation (ADR-0102).
export function IndicatorsRoute() {
  return <IndicatorsPage readOnly={useAdminRole() !== "administrator"} />;
}
