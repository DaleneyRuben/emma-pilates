import type { ReactNode } from "react";

// AW01/AW30/AW32: no sidebar or top bar before a session exists; a centered
// card on desktop that fills the width, with less padding, when narrow.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-arena px-4 py-10 text-texto">
      <div className="flex w-full max-w-[420px] flex-col gap-6 rounded-marco border border-borde bg-blanco px-5 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="font-serif text-display text-texto">Emma</p>
          <p className="text-nota text-texto-tenue">
            Movimiento · Equilibrio · Bienestar
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
