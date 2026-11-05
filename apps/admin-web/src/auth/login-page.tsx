import { CircleCheck, Clock3, type LucideIcon } from "lucide-react";
import { useDocumentTitle } from "../app/use-document-title";
import type { LoginNotice, LoginSearch } from "./auth-search";
import { AuthHeading, AuthLayout } from "./auth-layout";
import { InfoRow } from "./auth-notices";
import { LoginForm } from "./login-form";

const notices: Record<LoginNotice, { icon: LucideIcon; text: string }> = {
  "session-ended": {
    icon: Clock3,
    text: "Tu sesión terminó. Vuelve a iniciar sesión.",
  },
  activated: {
    icon: CircleCheck,
    text: "Tu cuenta está activa. Inicia sesión con tu nueva contraseña.",
  },
  "password-updated": {
    icon: CircleCheck,
    text: "Tu contraseña se actualizó. Inicia sesión con la nueva contraseña.",
  },
};

export function LoginPage({ search }: { search: LoginSearch }) {
  useDocumentTitle("Iniciar sesión");
  return (
    <AuthLayout>
      <AuthHeading
        title="Inicia sesión"
        line="Para Administración y Coordinación."
      />
      {search.notice === undefined ? null : (
        <InfoRow icon={notices[search.notice].icon}>
          {notices[search.notice].text}
        </InfoRow>
      )}
      <LoginForm redirect={search.redirect} />
    </AuthLayout>
  );
}
