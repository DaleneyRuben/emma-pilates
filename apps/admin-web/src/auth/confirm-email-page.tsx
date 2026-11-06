import {
  completeEmailChange,
  type EmailChangeCompletionResultDto,
} from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AtSign,
  Clock,
  Link2Off,
  MailCheck,
  type LucideIcon,
} from "lucide-react";
import { adminFetch } from "../api/fetcher";
import { useDocumentTitle } from "../app/use-document-title";
import { buttonVariants } from "../components/ui/button";
import { AuthLayout } from "./auth-layout";
import { MessageDisc } from "./auth-notices";

type Outcome = EmailChangeCompletionResultDto["status"];

// FIX-039 (DES-012): a Staff Member's change was asked by the studio, so each
// outcome sends her back to the studio. Completing needs no session.
const copy: Record<Outcome, { icon: LucideIcon; title: string; line: string }> =
  {
    changed: {
      icon: MailCheck,
      title: "Correo confirmado",
      line: "Desde ahora entras con tu correo nuevo. Tu contraseña no cambió.",
    },
    expired: {
      icon: Clock,
      title: "El enlace ya no sirve",
      line: "Este enlace venció o ya no sirve. Pide en el estudio que te envíen otro; mientras tanto sigues entrando con tu correo anterior.",
    },
    email_unavailable: {
      icon: AtSign,
      title: "No pudimos cambiar el correo",
      line: "Ese correo ya lo usa otra cuenta, así que no lo cambiamos. Habla con el estudio.",
    },
    invalid: {
      icon: Link2Off,
      title: "Enlace no válido",
      line: "Este enlace no es válido.",
    },
  };

/**
 * The page the email-change link opens on a computer (the Staff app opens
 * it on a phone; the link page offers both, ADR-0095).
 */
export function ConfirmEmailPage({ token }: { token: string | undefined }) {
  useDocumentTitle("Confirmar correo");
  const completion = useQuery({
    queryKey: ["email-change-completion", token],
    queryFn: async () =>
      (
        (
          await completeEmailChange(
            { token: token ?? "" },
            undefined,
            adminFetch,
          )
        ).data as EmailChangeCompletionResultDto
      ).status,
    enabled: token !== undefined,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  });
  const outcome: Outcome | "loading" | "unavailable" =
    token === undefined
      ? "invalid"
      : completion.isPending
        ? "loading"
        : completion.isError
          ? "unavailable"
          : completion.data;

  return (
    <AuthLayout>
      {outcome === "loading" ? (
        <p role="status" className="text-center text-cuerpo text-texto-tenue">
          Confirmando tu correo…
        </p>
      ) : outcome === "unavailable" ? (
        <p
          role="alert"
          className="text-center text-cuerpo text-texto-secundario"
        >
          No pudimos confirmar el correo. Inténtalo de nuevo en unos minutos.
        </p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <MessageDisc icon={copy[outcome].icon} />
            <h1 className="font-serif text-titulo-1 text-texto">
              {copy[outcome].title}
            </h1>
            <p className="text-cuerpo text-texto-tenue">{copy[outcome].line}</p>
          </div>
          <Link to="/iniciar-sesion" className={buttonVariants({ size: "lg" })}>
            Ir a iniciar sesión
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
