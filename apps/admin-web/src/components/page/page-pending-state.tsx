/**
 * Design follow-up 106: only the logo, centred in the content area it is
 * given, while a page's chunk is slow to arrive (WEB-035). The breath and
 * its Reduce Motion stillness come from `.carga-logo` in `src/carga.css`,
 * the same rule the first-load state in index.html uses. Inside the shell
 * `h-full` is the main area's content box; at the root (Login's session
 * probe after a logout) it falls back to the minimum band.
 */
export function PagePendingState() {
  return (
    <div
      role="status"
      aria-label="Cargando la página"
      className="flex h-full min-h-[320px] items-center justify-center"
    >
      <img
        className="carga-logo"
        src="/emma-logo.png"
        alt=""
        width={800}
        height={333}
      />
    </div>
  );
}
