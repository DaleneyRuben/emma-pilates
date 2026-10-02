import { WaitNotice } from "../../auth/request-limit-notice";
import { accountEmailLimitMessage } from "./staff-problems";
import type { EmailLimit } from "./use-email-limit";

const notices = {
  account: {
    message: accountEmailLimitMessage,
    waitLabel: "Podrás enviarlo en",
  },
  // AW24 «Reenvío limitado»: the recipient lane is full; the current link works.
  recipient: {
    message:
      "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.",
    waitLabel: "Podrás reenviarlo en",
  },
} as const;

/** AW24 (follow-ups 54, 78): drawn at the top of the panel body. */
export function EmailLimitNotice({ limit }: { limit: EmailLimit }) {
  if (limit.seconds <= 0) return null;
  return <WaitNotice {...notices[limit.lane]} seconds={limit.seconds} />;
}
