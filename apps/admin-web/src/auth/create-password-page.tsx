import {
  activateAccount,
  completeAdminWebPasswordRecovery,
  inspectAuthenticationLink,
  type AuthenticationLinkInspectionDto,
  type CurrentAuthenticationPrincipalDto,
} from "@pilates/api-contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { adminFetch } from "../api/fetcher";
import { useDocumentTitle } from "../app/use-document-title";
import { buttonVariants } from "../components/ui/button";
import { currentSessionQueryOptions } from "../session/session-queries";
import { useStartSession } from "../session/use-start-session";
import { AuthLayout } from "./auth-layout";
import { BackToLoginLink } from "./back-to-login-link";
import { CreatePasswordForm } from "./create-password-form";

type Purpose = "activation" | "password_recovery";
type LinkState =
  { status: "invalid" } | { status: "expired" | "current"; purpose: Purpose };

const toLinkState = (inspection: AuthenticationLinkInspectionDto): LinkState =>
  inspection.status === "invalid" || inspection.purpose === undefined
    ? { status: "invalid" }
    : { status: inspection.status, purpose: inspection.purpose };

const copy: Record<Purpose, { title: string; line: string }> = {
  activation: {
    title: "Crea tu contraseña",
    line: "Elegir tu contraseña activa tu cuenta y confirma tu correo.",
  },
  password_recovery: {
    title: "Crea una contraseña nueva",
    line: "Elige una contraseña nueva para tu cuenta.",
  },
};

function Message({ title, children }: { title: string; children: string }) {
  return (
    <div className="flex flex-col gap-2 text-center">
      <h1 className="font-serif text-titulo-2 text-texto">{title}</h1>
      <p className="text-cuerpo text-texto-secundario">{children}</p>
    </div>
  );
}

function ExpiredLink({ purpose }: { purpose: Purpose }) {
  if (purpose === "activation") {
    // Only the studio can issue a new invitation (follow-up 35).
    return (
      <Message title="Este enlace ya no es válido">
        Las invitaciones vencen a los 7 días y sirven una sola vez. Pide a la
        administración del estudio que te envíe una nueva.
      </Message>
    );
  }
  return (
    <>
      <Message title="Este enlace ya no es válido">
        Los enlaces para restablecer la contraseña vencen a los 30 minutos y
        sirven una sola vez.
      </Message>
      <Link
        to="/recuperar-contrasena"
        className={buttonVariants({ size: "lg" })}
      >
        Pedir un enlace nuevo
      </Link>
    </>
  );
}

/**
 * AW32 (follow-ups 35–36): the page an emailed Activation or
 * Password-Recovery Link opens. The link is inspected before any form is
 * shown; activation never signs in, recovery opens the replacement browser
 * session only for an Administrator.
 */
export function CreatePasswordPage({ token }: { token: string | undefined }) {
  useDocumentTitle("Crear contraseña");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const startSession = useStartSession();
  const [override, setOverride] = useState<LinkState | null>(null);
  const [failed, setFailed] = useState(false);
  const inspection = useQuery({
    queryKey: ["authentication-link", token],
    queryFn: async () =>
      toLinkState(
        (
          await inspectAuthenticationLink(
            { token: token ?? "" },
            undefined,
            adminFetch,
          )
        ).data as AuthenticationLinkInspectionDto,
      ),
    enabled: token !== undefined,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  });

  const submit = async (password: string, purpose: Purpose) => {
    setFailed(false);
    try {
      if (purpose === "activation") {
        const result = (
          await activateAccount(
            { token: token ?? "", password },
            undefined,
            adminFetch,
          )
        ).data;
        if (result.status === "activated") {
          await navigate({
            to: "/iniciar-sesion",
            search: { notice: "activated" },
          });
        } else {
          setOverride(
            result.status === "expired"
              ? { status: "expired", purpose }
              : { status: "invalid" },
          );
        }
        return;
      }

      const result = (
        await completeAdminWebPasswordRecovery(
          { token: token ?? "", password },
          undefined,
          adminFetch,
        )
      ).data;
      if (result.status !== "recovered") {
        setOverride(
          result.status === "expired"
            ? { status: "expired", purpose }
            : { status: "invalid" },
        );
      } else if (result.signedIn) {
        const principal = (await queryClient.fetchQuery(
          currentSessionQueryOptions(),
        )) as CurrentAuthenticationPrincipalDto;
        await startSession(principal);
      } else {
        await navigate({
          to: "/iniciar-sesion",
          search: { notice: "password-updated" },
        });
      }
    } catch {
      setFailed(true);
    }
  };

  const state: LinkState | "loading" | "unavailable" =
    override ??
    (token === undefined
      ? { status: "invalid" }
      : inspection.isPending
        ? "loading"
        : inspection.isError
          ? "unavailable"
          : inspection.data);

  return (
    <AuthLayout>
      {state === "loading" ? (
        <p role="status" className="text-center text-cuerpo text-texto-tenue">
          Revisando el enlace…
        </p>
      ) : null}
      {state === "unavailable" ? (
        <p
          role="alert"
          className="text-center text-cuerpo text-texto-secundario"
        >
          No pudimos revisar el enlace. Inténtalo de nuevo en unos minutos.
        </p>
      ) : null}
      {typeof state === "object" && state.status === "invalid" ? (
        <Message title="Este enlace no es válido">
          Abre el enlace completo del correo más reciente que recibiste.
        </Message>
      ) : null}
      {typeof state === "object" && state.status === "expired" ? (
        <ExpiredLink purpose={state.purpose} />
      ) : null}
      {typeof state === "object" && state.status === "current" ? (
        <>
          <div className="flex flex-col gap-2 text-center">
            <h1 className="font-serif text-titulo-2 text-texto">
              {copy[state.purpose].title}
            </h1>
            <p className="text-cuerpo text-texto-secundario">
              {copy[state.purpose].line}
            </p>
          </div>
          <CreatePasswordForm
            failed={failed}
            onSubmit={(password) => submit(password, state.purpose)}
          />
        </>
      ) : null}
      <BackToLoginLink />
    </AuthLayout>
  );
}
