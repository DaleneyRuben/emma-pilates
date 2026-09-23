import { useRouter } from "@tanstack/react-router";
import { AuthLayout } from "../auth/auth-layout";
import { Button } from "../components/ui/button";

// The session probe could not reach the backend: neither signed in nor
// signed out is known yet, so offer a retry rather than Login.
export function StartupErrorPage() {
  const router = useRouter();

  return (
    <AuthLayout>
      <h1 className="sr-only">Sin conexión</h1>
      <p role="alert" className="text-center text-cuerpo text-texto-secundario">
        No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de
        nuevo.
      </p>
      <Button size="lg" onClick={() => void router.invalidate()}>
        Reintentar
      </Button>
    </AuthLayout>
  );
}
