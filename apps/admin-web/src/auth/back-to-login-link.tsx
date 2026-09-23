import { Link } from "@tanstack/react-router";

export function BackToLoginLink() {
  return (
    <Link
      to="/iniciar-sesion"
      className="self-center text-nota font-medium text-primario underline-offset-4 hover:text-primario-presionado hover:underline"
    >
      Volver a iniciar sesión
    </Link>
  );
}
