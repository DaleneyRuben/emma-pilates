import { Link } from "@tanstack/react-router";

// P10: a text button in Rosa enlace, 44 px high, without an underline.
export const authTextLinkClass =
  "inline-flex h-11 items-center self-center px-2.5 text-cuerpo font-semibold rounded-tarjeta text-rosa-enlace hover:bg-lino";

export function BackToLoginLink() {
  return (
    <Link to="/iniciar-sesion" className={authTextLinkClass}>
      Volver a iniciar sesión
    </Link>
  );
}
