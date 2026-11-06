import type { ReactNode } from "react";

import { recoveryScreenLayout } from "./render-error-boundary";
import { InsideTabBar } from "./screen";

type StackLayoutProps = {
  children: ReactNode;
  navigation: { getState: () => { routes: readonly { key: string }[] } };
  route: { key: string; name?: string };
};

/**
 * A React Navigation `screenLayout` for a stack inside a tab. Each screen
 * recovers on its own; the stack's root sits over the tab bar, which covers the
 * bottom safe area (FIX-023), while a pushed screen hides the bar (as the
 * boards draw it), so it keeps the safe area itself.
 */
export function tabStackScreenLayout({ children, navigation, route }: StackLayoutProps) {
  const content = recoveryScreenLayout({ children });
  const root = navigation.getState().routes[0]?.key === route.key;
  return root ? <InsideTabBar>{content}</InsideTabBar> : content;
}

/**
 * Design follow-up 254 § 3: the tab bar stays on browsing screens and hides
 * only inside a task (a purchase, a booking, a form). A pushed browsing
 * screen sits over the bar like its root; a task keeps the safe area itself.
 */
export function createTabStackScreenLayout(tasks: ReadonlySet<string>) {
  return function taskAwareScreenLayout({ children, navigation, route }: StackLayoutProps) {
    const content = recoveryScreenLayout({ children });
    const root = navigation.getState().routes[0]?.key === route.key;
    const task = route.name !== undefined && tasks.has(route.name);
    return root || !task ? <InsideTabBar>{content}</InsideTabBar> : content;
  };
}

/** Whether the bar hides for the focused route of a tab's stack. */
export const tabBarHidden = (
  tasks: ReadonlySet<string>,
  focused: string | undefined,
  root: string,
): boolean => focused !== undefined && focused !== root && tasks.has(focused);
