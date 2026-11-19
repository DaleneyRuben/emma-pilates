import type { ReactNode } from "react";

import { ScreenHeader } from "./screen-header";

/** The pushed screen's header: the shared EncabezadoA (FIX-089). */
export function ScreenTopBar({
  action,
  fullBleed = false,
  onBack,
  title,
}: {
  action?: ReactNode;
  fullBleed?: boolean;
  onBack: () => void;
  title: string;
}) {
  return (
    <ScreenHeader
      action={action}
      fullBleed={fullBleed}
      inset
      onBack={onBack}
      testID="screen-top-bar"
      title={title}
    />
  );
}
