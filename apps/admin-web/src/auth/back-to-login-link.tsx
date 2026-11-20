import { Link } from "@tanstack/react-router";
import { TextLink } from "../components/ui/text-link";

// P10: a link on its own, 44 px high (follow-up 285: `enlace`, underlined).
export const authTextLinkClass =
  "inline-flex h-11 items-center self-center rounded-tarjeta px-2.5";

export function BackToLoginLink() {
  return (
    <TextLink asChild className={authTextLinkClass}>
      <Link to="/iniciar-sesion">Volver a iniciar sesión</Link>
    </TextLink>
  );
}
