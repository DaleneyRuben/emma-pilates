import { useCallback, useState } from "react";
import { useCountdown } from "../../auth/use-countdown";

export type Lane = "account" | "recipient";

export type EmailLimit = {
  lane: Lane;
  seconds: number;
  start: (lane: Lane, seconds: number) => void;
};

/** The server's wait for a pending member's emails, from either lane. */
export function useEmailLimit(): EmailLimit {
  const [seconds, startWait] = useCountdown();
  const [lane, setLane] = useState<Lane>("recipient");
  const start = useCallback(
    (next: Lane, wait: number) => {
      setLane(next);
      startWait(wait);
    },
    [startWait],
  );
  return { lane, seconds, start };
}
