import { within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

/**
 * FIX-091 (W1): the class panel is titled by the class, «Lun 23 nov · 07:00
 * · Reformer Pilates»; this matches any of them.
 */
export const classPanelName = /^\S+ \d{1,2} \S+ · \d{2}:\d{2} · /;

/** Opens one of the class panel's tabs and returns its tab panel. */
export async function openPanelTab(
  user: UserEvent,
  panel: HTMLElement,
  name: string | RegExp,
): Promise<HTMLElement> {
  await user.click(within(panel).getByRole("tab", { name }));
  return within(panel).findByRole("tabpanel");
}
