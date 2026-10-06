# Follow-up — `S13`'s note: started Sessions leave the cancel list

Targets: **Staff `S13`** (the «Incluye clases llenas» note in the notes card
only). Send [30](./30-invariants-checklist.md) alongside this follow-up;
like [71](./71-readme-aw24-password-reset-leftover.md) it corrects a sentence the
design makes about its own behaviour.

---

Found by MOB-044 on 2026-10-06, deciding per Role which Staff list keeps
today's Sessions that already started:

1. `S13`'s note «Incluye clases llenas» says «A diferencia de la lista de
   cliente, aquí no se oculta ninguna sesión: la que hay que cancelar suele
   ser la que está llena.» Its point is the full class, which `03` hides
   nothing of either (`03` hides only the day's past Sessions). But read
   literally it promises that no Session is hidden, and the cancel-session
   use case refuses a Session that has started (`session_not_cancellable`),
   so a started Session on this list would only lead to a refusal. The app
   leaves started Sessions out of `S13`, as it does on `S07` and `03`, and
   keeps them only on the Trainer's `S02`, where attendance is recorded
   after the class.

## 1. `S13` — the note

Change the note's text to: «A diferencia de la lista de cliente, aquí no se
oculta ninguna clase llena: la que hay que cancelar suele ser la que está
llena. Las sesiones que ya empezaron no aparecen, porque ya no pueden
cancelarse.» The heading «Incluye clases llenas» and the other notes stay.

## What must remain untouched

Every frame of `S13`, its scripts, and the other four notes.
