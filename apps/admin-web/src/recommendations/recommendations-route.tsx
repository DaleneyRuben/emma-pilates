import { useAdminRole } from "../session/admin-role";
import { RecommendationsPage } from "./recommendations-page";

export function RecommendationsRoute() {
  return <RecommendationsPage readOnly={useAdminRole() !== "administrator"} />;
}
