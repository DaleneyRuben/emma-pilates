import {
  correctClientAcquisition,
  getClientAcquisition,
  getGetClientAcquisitionQueryKey,
  type ClientAcquisitionDto,
} from "@pilates/api-contracts";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useId, useState } from "react";
import { adminFetch } from "../../api/fetcher";
import { isApiError } from "../../api/problem";
import { SummaryRow } from "../../components/panel/summary-rows";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import {
  channelLabels,
  declaredChannels,
  type DeclaredChannel,
} from "../acquisition-labels";

const acquisitionQueryOptions = (clientId: string) =>
  queryOptions({
    queryKey: getGetClientAcquisitionQueryKey(clientId),
    queryFn: async ({ signal }) =>
      (await getClientAcquisition(clientId, { signal }, adminFetch)).data,
  });

const failureMessage = (error: unknown): string =>
  isApiError(error) && error.code === "referral_code_invalid"
    ? "No encontramos ese código. Revísalo o déjalo vacío."
    : isApiError(error) && error.code === "referral_self_reference"
      ? "Es el código de la misma clienta."
      : "No pudimos guardar la corrección. Inténtalo de nuevo.";

// The answer she gave, or the attribution, whichever names a real channel.
const startingChannel = (acquisition: ClientAcquisitionDto): string =>
  [acquisition.declaredChannel, acquisition.channel].find(
    (channel) => channel !== "unknown",
  ) ?? "";

function AcquisitionForm({
  acquisition,
  onDone,
}: {
  acquisition: ClientAcquisitionDto;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const ids = useId();
  const [channel, setChannel] = useState(startingChannel(acquisition));
  const [code, setCode] = useState(acquisition.referralCode ?? "");
  const [missingChannel, setMissingChannel] = useState(false);
  const correction = useMutation({
    mutationFn: async (body: {
      channel: DeclaredChannel;
      referralCode: string | null;
    }) =>
      (
        await correctClientAcquisition(
          acquisition.clientId,
          body,
          undefined,
          adminFetch,
        )
      ).data,
    onSuccess: (saved) => {
      queryClient.setQueryData(
        getGetClientAcquisitionQueryKey(acquisition.clientId),
        saved,
      );
      onDone();
    },
  });

  const save = () => {
    const chosen = declaredChannels.find((option) => option === channel);
    setMissingChannel(chosen === undefined);
    if (chosen === undefined) return;
    const trimmed = code.trim();
    correction.mutate({
      channel: chosen,
      referralCode: trimmed === "" ? null : trimmed,
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-control border border-divisor bg-superficie p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${ids}-channel`}>Canal</Label>
        <Select
          id={`${ids}-channel`}
          aria-invalid={missingChannel}
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
        >
          <option value="" disabled>
            Elige un canal
          </option>
          {declaredChannels.map((option) => (
            <option key={option} value={option}>
              {channelLabels[option]}
            </option>
          ))}
        </Select>
        {missingChannel ? (
          <p role="alert" className="text-ayuda text-error-texto">
            Elige cómo nos conoció.
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${ids}-code`}>Código (opcional)</Label>
        <Input
          id={`${ids}-code`}
          autoComplete="off"
          aria-invalid={correction.isError}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
        />
        <p className="text-ayuda text-texto-tenue">
          De una clienta o de una instructora. Si lo escribes, decide el canal.
        </p>
        {correction.isError ? (
          <p role="alert" className="text-ayuda text-error-texto">
            {failureMessage(correction.error)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          busy={correction.isPending}
          onClick={save}
        >
          Guardar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function AcquisitionRows({
  acquisition,
}: {
  acquisition: ClientAcquisitionDto;
}) {
  const answeredOtherwise =
    acquisition.declaredChannel !== "unknown" &&
    acquisition.declaredChannel !== acquisition.channel;
  return (
    <dl className="flex flex-col divide-y divide-divisor rounded-control border border-divisor bg-superficie">
      <SummaryRow label="Canal">
        <span className="flex flex-col items-end">
          <span
            className={
              acquisition.channel === "unknown"
                ? "text-texto-muy-tenue"
                : undefined
            }
          >
            {channelLabels[acquisition.channel]}
          </span>
          {answeredOtherwise ? (
            <span className="text-ayuda text-texto-tenue">
              Ella respondió: {channelLabels[acquisition.declaredChannel]}
            </span>
          ) : null}
        </span>
      </SummaryRow>
      {acquisition.referralCode === null ? null : (
        <SummaryRow label="Código">
          <span className="rounded-control border border-borde bg-blanco px-2 py-0.5 font-mono text-ayuda tracking-wider text-texto-secundario">
            {acquisition.referralCode}
          </span>
        </SummaryRow>
      )}
      {acquisition.referrer === null ? null : (
        <SummaryRow
          label={
            acquisition.referrer.kind === "trainer"
              ? "La trajo la instructora"
              : "La recomendó"
          }
        >
          {acquisition.referrer.name}
        </SummaryRow>
      )}
    </dl>
  );
}

// BKM-011 (follow-up 142): how the Client found the studio. The code, when
// there is one, decides the channel; a correction is judged the same way.
export function ClientAcquisitionBlock({ clientId }: { clientId: string }) {
  const query = useQuery(acquisitionQueryOptions(clientId));
  const [editing, setEditing] = useState(false);
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <h3
          id={titleId}
          className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase"
        >
          ¿Cómo nos conociste?
        </h3>
        {query.data === undefined || editing ? null : (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Corregir
          </Button>
        )}
      </div>
      {query.data === undefined ? (
        <p className="text-nota text-texto-tenue">
          {query.isError ? "No pudimos leer este dato." : "Cargando…"}
        </p>
      ) : editing ? (
        <AcquisitionForm
          acquisition={query.data}
          onDone={() => setEditing(false)}
        />
      ) : (
        <AcquisitionRows acquisition={query.data} />
      )}
    </section>
  );
}
