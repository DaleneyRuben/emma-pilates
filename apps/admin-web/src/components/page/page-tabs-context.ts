import { createContext, type ReactNode } from "react";

/**
 * The shell's destination tabs, handed to whichever page header draws them
 * (follow-up 233: under the title and actions). A page drawn on its own, as
 * in its spec, has none.
 */
export const PageTabsContext = createContext<ReactNode>(null);
