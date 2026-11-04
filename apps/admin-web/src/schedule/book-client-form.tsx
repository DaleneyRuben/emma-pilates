import type {
  AdminClientDto,
  AdministratorSessionAvailabilityDto,
} from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatusPill } from "../components/ui/status-pill";
import { bookingProblem } from "./booking-problems";
import {
  clientSearchQueryOptions,
  minimumClientQuery,
  useBookClient,
} from "./session-roster-queries";

const canBook = (client: AdminClientDto) =>
  client.subscriptionStatus === "active";

function ClientResults({
  q,
  onPick,
}: {
  q: string;
  onPick: (client: AdminClientDto) => void;
}) {
  const results = useQuery(clientSearchQueryOptions(q));
  if (q.length < minimumClientQuery) return null;
  if (results.isPending) {
    return <p className="text-celda text-texto-tenue">Buscando…</p>;
  }
  if (results.isError) {
    return (
      <p role="alert" className="text-celda text-error-texto">
        No pudimos buscar. Inténtalo de nuevo.
      </p>
    );
  }
  if (results.data.items.length === 0) {
    return (
      <p className="text-celda text-texto-tenue">
        No encontramos clientas con esa búsqueda.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-divisor rounded-tarjeta bg-lino">
      {results.data.items.map((client) => (
        <li
          key={client.id}
          className="flex min-h-[52px] items-center gap-3 px-4 py-2"
        >
          <span className="flex flex-1 flex-col">
            <span className="text-celda font-medium text-texto">
              {client.name}
            </span>
            <span className="text-ayuda text-texto-tenue">
              {client.planName ?? client.email}
            </span>
          </span>
          {canBook(client) ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPick(client)}
            >
              Elegir<span className="sr-only"> a {client.name}</span>
            </Button>
          ) : (
            <StatusPill tone="neutral">Sin plan activo</StatusPill>
          )}
        </li>
      ))}
    </ul>
  );
}

// WEB-039 (board P02, «Reservar a una clienta»): search the studio's
// Clients, pick one, confirm. A full class sends her to the Waitlist.
export function BookClientForm({
  session,
  branchId,
  full,
  nextPosition,
  onBooked,
}: {
  session: AdministratorSessionAvailabilityDto;
  branchId: string;
  full: boolean;
  nextPosition: number;
  onBooked: (notice: string) => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<AdminClientDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const book = useBookClient(session.id, branchId);

  const confirm = async (client: AdminClientDto) => {
    setFailure(null);
    try {
      await book.mutateAsync({ clientId: client.id, waitlist: full });
      onBooked(
        full
          ? `${client.name} quedó en la lista de espera.`
          : `${client.name} quedó reservada.`,
      );
    } catch (error) {
      setFailure(bookingProblem(error, client.name));
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 px-7 py-4">
      {full ? (
        <p className="rounded-tarjeta bg-advertencia/12 px-4 py-3 text-celda text-advertencia-texto">
          La clase está llena: la clienta entra a la lista de espera en el
          puesto {nextPosition}.
        </p>
      ) : null}
      {picked === null ? (
        <>
          <label className="relative block">
            <Search
              size={16}
              aria-hidden="true"
              className="absolute top-1/2 left-3 -translate-y-1/2 text-rosa-empolvado"
            />
            <Input
              aria-label="Buscar clienta"
              placeholder="Nombre, correo o teléfono"
              value={q}
              autoComplete="off"
              className="pl-9"
              onChange={(event) => setQ(event.target.value)}
            />
          </label>
          <ClientResults q={q.trim()} onPick={setPicked} />
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-cuerpo text-texto">
            {full
              ? `¿Agregar a ${picked.name} a la lista de espera?`
              : `¿Reservar a ${picked.name} en esta clase?`}
          </p>
          {failure === null ? null : (
            <p role="alert" className="text-celda text-error-texto">
              {failure}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="neutral"
              onClick={() => {
                setFailure(null);
                setPicked(null);
              }}
            >
              Elegir otra
            </Button>
            <Button busy={book.isPending} onClick={() => void confirm(picked)}>
              {full ? "Agregar a la lista" : "Confirmar la reserva"}
            </Button>
          </div>
        </div>
      )}
      <p className="text-ayuda text-texto-tenue">
        {full
          ? "Si se libera un lugar, entra sola y le llega el aviso."
          : "La reserva usa una clase de su plan y le llega el aviso como si reservara ella."}
      </p>
    </div>
  );
}
