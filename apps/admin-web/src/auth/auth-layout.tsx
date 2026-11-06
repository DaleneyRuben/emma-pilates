import type { ReactNode } from "react";

// P10 (follow-up 239, DES-007 proposal A): the studio's logo on a Rosa tinte
// panel beside the form, which sits on the page's Marfil without a card.
// Under 900 px the panel becomes a band above the form.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-superficie text-texto min-[900px]:flex-row">
      <aside className="flex h-[200px] flex-none items-center justify-center bg-rosa-tinte p-5 min-[900px]:h-auto min-[900px]:w-1/2 min-[900px]:p-12">
        <img
          src="/emma-logo.png"
          alt="Emma Pilates Studio"
          width={1312}
          height={565}
          className="h-auto w-[240px] max-w-full min-[900px]:w-[440px]"
        />
      </aside>
      <main className="flex flex-1 justify-center px-5 pt-8 pb-10 min-[900px]:items-center min-[900px]:px-10 min-[900px]:py-12">
        <div className="flex w-full max-w-[400px] flex-col gap-4">
          {children}
        </div>
      </main>
    </div>
  );
}

/** The screen's visible title and the line under it. */
export function AuthHeading({ title, line }: { title: string; line: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="font-serif text-titulo-1 text-texto">{title}</h1>
      <p className="text-cuerpo text-texto-tenue">{line}</p>
    </div>
  );
}
