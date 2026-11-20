import { addCivilDays } from "@pilates/mobile-core";

import { type ApprovedFreeze, weekdayAndDay } from "../booking/frozen-day";
import { freezeRange } from "../subscription/freeze-window";
import { HomeNotice } from "./home-notice";

/** How far ahead Inicio starts announcing an approved Freeze. */
const announceDays = 7;

/** An approved Freeze running today or starting within a week. */
export function freezeToAnnounce(
  freeze: ApprovedFreeze | null,
  today: string,
): ApprovedFreeze | null {
  if (freeze === null || freeze.endsOn < today) return null;
  return freeze.startsOn <= addCivilDays(today, announceDays) ? freeze : null;
}

/** C1 C (owner 2026-11-19): «Plan congelado» on Inicio, with the day she is back. */
export function HomeFreezeNotice({
  freeze,
  onOpen,
}: {
  freeze: ApprovedFreeze;
  onOpen: () => void;
}) {
  const back = weekdayAndDay(addCivilDays(freeze.endsOn, 1)).toLowerCase();
  return (
    <HomeNotice
      eyebrow="Plan congelado"
      lines={[`No puedes reservar esos días. Vuelves el ${back}.`]}
      link={{ label: "Ver mi congelamiento", onPress: onOpen, testID: "home-freeze-open" }}
      onPress={onOpen}
      testID="home-freeze-notice"
      title={freezeRange(freeze.startsOn, freeze.endsOn)}
    />
  );
}
