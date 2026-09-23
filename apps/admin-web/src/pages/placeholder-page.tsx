import type { NavigationItem } from "../app/navigation";

// Every sidebar entry lands here until its WEB item builds the real screen.
export function PlaceholderPage({ item }: { item: NavigationItem }) {
  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-titulo-pagina text-texto">{item.label}</h1>
        <span className="text-ayuda text-texto-muy-tenue tabular">
          Pantalla {item.screen}
        </span>
      </header>
      <section className="rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center">
        <p className="text-cuerpo text-texto-secundario">
          Esta sección aún no está disponible.
        </p>
        <p className="mt-1 text-nota text-texto-tenue">
          El menú, la barra superior y el selector de sucursal ya funcionan; el
          contenido de esta página llega en una próxima entrega.
        </p>
      </section>
    </article>
  );
}
