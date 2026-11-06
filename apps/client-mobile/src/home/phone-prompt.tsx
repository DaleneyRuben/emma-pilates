import {
  getGetCurrentClientProfileQueryKey,
  updateCurrentClientProfile,
  type ClientProfileDto,
} from "@pilates/api-contracts";
import {
  BrandToast,
  parseStoredPhone,
  phoneProblem,
  PhonePromptSheet,
  storedPhone,
  type PhoneValue,
} from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useClientFetcher } from "../client-fetcher";

// «Ahora no» holds for this app session; the next launch asks again.
let snoozed = false;

/** Spec seam: a new app session. */
export function resetPhonePrompt() {
  snoozed = false;
}

/**
 * Design follow-up 254 § 1 (walkthrough 2 n.º 34, option A): a Client without
 * a valid mobile, registered before the phone rule, is asked for one in a
 * sheet over Inicio. It never blocks booking.
 */
export function PhonePrompt({ client }: { client: ClientProfileDto }) {
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const stored = client.phone ?? null;
  const start = parseStoredPhone(stored);
  const missing = stored === null || stored.trim() === "";
  const needed = missing || phoneProblem(start.country, start.digits) !== null;
  const [open, setOpen] = useState(needed && !snoozed);
  const [phone, setPhone] = useState<PhoneValue>(start);
  const [touched, setTouched] = useState(!missing);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const problem = touched ? phoneProblem(phone.country, phone.digits) : null;

  const later = () => {
    snoozed = true;
    setOpen(false);
  };

  const save = async () => {
    setTouched(true);
    if (phoneProblem(phone.country, phone.digits) !== null) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await updateCurrentClientProfile(
        { name: client.name, phone: storedPhone(phone.country, phone.digits) },
        { headers: { "Content-Type": "application/json" } },
        fetcher,
      );
      if (response.status !== 200) {
        setFailed(true);
        return;
      }
      queryClient.setQueryData(getGetCurrentClientProfileQueryKey(), response);
      setOpen(false);
      setSaved(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PhonePromptSheet
        busy={busy}
        error={problem}
        failed={failed}
        missing={missing}
        onChange={(next) => {
          setPhone(next);
          setTouched(true);
        }}
        onLater={later}
        onSave={() => void save()}
        value={phone}
        visible={open}
      />
      {saved ? <BrandToast onClose={() => setSaved(false)} title="Celular guardado" /> : null}
    </>
  );
}
