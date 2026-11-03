import type { ReactNode } from "react";

import { recoveryScreenLayout } from "./render-error-boundary";
import { InsideTabBar } from "./screen";

type StackLayoutProps = {
  children: ReactNode;
  navigation: { getState: () => { routes: readonly { key: string }[] } };
  route: { key: string };
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
