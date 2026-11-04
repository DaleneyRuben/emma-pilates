import { useQuery } from "@tanstack/react-query";
import { staffProfileQueryOptions } from "../session/staff-profile-query";
import { useBranchSelection } from "../shell/branch/use-branch-selection";
import { homeGreeting } from "./home-greeting";

// P01 (follow-up 232): the greeting and the day with the Branch it reads.
// The summaries, the pending list and Recomendaciones follow in their own
// change.
export function HomePage() {
  const { data: profile } = useQuery(staffProfileQueryOptions());
  const { selectedBranch } = useBranchSelection();
  const { title, day } = homeGreeting(profile?.name ?? "");

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-[32px] leading-tight text-texto">{title}</h1>
      <p className="text-cuerpo text-tenue">
        {selectedBranch === undefined
          ? day
          : `${day} · Sucursal ${selectedBranch.name}`}
      </p>
    </div>
  );
}
