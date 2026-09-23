import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-titulo-pagina text-texto">Página no encontrada</h1>
      <section className="rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center">
        <p className="text-cuerpo text-texto-secundario">
          La dirección que abriste no corresponde a ninguna sección del panel.
        </p>
        <Link
          to="/"
          className="mt-3 inline-block text-cuerpo font-medium text-primario underline-offset-4 hover:text-primario-presionado hover:underline"
        >
          Volver al horario
        </Link>
      </section>
    </article>
  );
}
