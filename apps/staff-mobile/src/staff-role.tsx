import { createContext, useContext } from "react";

import type { StaffRole } from "./notifications/notification-destinations";

// The signed-in (or acted-as) Staff Role, for the screens the Assistant and
// the Coordinator share (ADR-0102): they differ in selling and registering.
export const StaffRoleContext = createContext<StaffRole>("assistant");

export const useStaffRole = (): StaffRole => useContext(StaffRoleContext);
