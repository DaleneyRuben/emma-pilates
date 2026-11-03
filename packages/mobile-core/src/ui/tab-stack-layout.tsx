import type { ReactNode } from "react";

import { recoveryScreenLayout } from "./render-error-boundary";
import { InsideTabBar } from "./screen";

type StackLayoutProps = {
  children: ReactNode;
  navigation: { getState: () => { routes: readonly { key: string }[] } };
  route: { key: string };
};

/** A React Navigation `screenLayout` for a stack inside a tab. */
export function tabStackScreenLayout({ children }: StackLayoutProps) {
  return <InsideTabBar>{recoveryScreenLayout({ children })}</InsideTabBar>;
}
