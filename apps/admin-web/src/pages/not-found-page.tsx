import { Link } from "@tanstack/react-router";
import { AuthHeading, AuthLayout } from "../auth/auth-layout";
import { buttonVariants } from "../components/ui/button";

// FIX-090: an unknown address is answered inside the studio's layout, the
// same for a signed-in person and a visitor, never on a bare page.
export function NotFoundPage() {
  return (
    <AuthLayout>
      <AuthHeading
        title="Página no encontrada"
        line="La dirección que abriste no existe o cambió."
      />
      <Link to="/" className={buttonVariants({ size: "lg" })}>
        Volver al inicio
      </Link>
    </AuthLayout>
  );
}
