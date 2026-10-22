import { PagePendingState } from "../components/page/page-pending-state";

// WEB-035, design follow-up 107: a page's chunk that has not arrived 400 ms
// after the click (the same delay as the mobile loading state) shows the
// logo in the content area, and keeps it at least 500 ms once shown so the
// logo itself never flashes. A page that arrives in time shows nothing.
export const pagePendingOptions = {
  defaultPendingComponent: PagePendingState,
  defaultPendingMs: 400,
  defaultPendingMinMs: 500,
} as const;
