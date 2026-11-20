import { ScreenHeader } from "@pilates/mobile-core";
import type { ReactNode } from "react";

import { NotificationBell } from "./notification-bell";

/**
 * A tab root's header (Rosa Emma): the 200 band with the uppercase eyebrow
 * such as «Instructora · Lunes 2 de noviembre» on a white capsule, the Lora 30
 * title, an optional one-line note, and on the roots that carry it the
 * notification bell. Perfil is a tab, so no root draws the avatar any more
 * (follow-up 225 §8).
 */
export function RootHeader({
  action,
  bell = false,
  children,
  eyebrow,
  label,
  note,
  title,
}: {
  action?: ReactNode;
  bell?: boolean;
  /** More of the band under the title, such as a day strip. */
  children?: ReactNode;
  eyebrow?: string;
  label?: string;
  note?: string;
  title: string;
}) {
  const accessory =
    action === undefined && !bell ? undefined : (
      <>
        {action}
        {bell ? <NotificationBell /> : null}
      </>
    );
  return (
    <ScreenHeader
      eyebrow={eyebrow}
      subtitle={note}
      testID="root-header"
      title={title}
      titleAccessory={accessory}
      titleLabel={label ?? title}
    >
      {children}
    </ScreenHeader>
  );
}
