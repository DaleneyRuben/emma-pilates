import { avisoClass } from "../ui/aviso";

// Design follow-up 53 §4 on v2, Rosa Emma (rw.py notice): one line on 50 in
// an Arcilla ring, above the content, naming what a change did; the page
// clears it when the next panel opens.
export function PageNotice({ children }: { children: string }) {
  return (
    <p role="status" className={avisoClass}>
      {children}
    </p>
  );
}
