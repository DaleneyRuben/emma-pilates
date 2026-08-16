---
name: design-workflow
description: >
  How design work happens in this repo: the design/ folder is generated output from
  Claude Design and is NEVER edited, reverted, or fixed by hand — changes go through
  prompts in docs/design/prompts/. Always active. Read before touching anything under
  design/, before "fixing" copy or a stale value in a screen, and before writing or
  editing any design prompt or follow-up.
---

## The one rule

**Never modify anything under `design/`.** Not the `.dc.html` screens, not `Sistema de Diseño.dc.html`, not `design/README.md`. They are all generated output from Claude Design, exported together.

That includes:
- No `Edit`/`Write` on those files, not even a one-word copy fix or an obviously stale number.
- No `git checkout -- design/…`, `git restore`, or any revert of that folder, even when an export looks like it regressed. A regression there is the tool's output, and the fix belongs in a prompt.
- No bulk git commands pointed at the folder (`git add design`). Stage explicit paths, or ask the user whether they want to commit their own output.

**Why:** the user runs Claude Design and re-exports the whole bundle. Any hand-edit is silently overwritten on the next export, so the repo drifts from what the design conversation actually produced. The conversation is the source of truth; `design/` is just its build artifact.

## How to change a screen instead

1. Write a short delta in `docs/design/prompts/followups/NN-slug.md` — next free number. Name the target screen(s) in a **Targets:** line, state what's wrong and why (cite `booking/CONTEXT.md` / `back-office/CONTEXT.md` / the relevant ADR), describe only the change, and end by saying what must stay untouched.
2. Add a row to the follow-ups table in `docs/design/prompts/README.md`, marked `🕓 pending`.
3. Hand it to the user. They send it as the next message in that surface's existing Claude Design conversation, so only the affected screens regenerate.
4. Once they've re-exported, verify the built files and flip the row to `✅ applied`.

For a screen that doesn't exist yet, write a **full prompt** instead — `docs/design/prompts/{client,staff,admin-web}/NN-slug.md`, following the shape of the existing ones (chaining note at the top, then design system reference, language, responsive frames, layout, states) — and add it to the matching table marked not yet generated. Never edit an already-generated screen's original prompt; that's what follow-ups are for.

`docs/` is the only part of the design system that is hand-edited.

## Auditing

When asked to check the designs for gaps, read the built screens' text and compare it against the glossaries in `booking/CONTEXT.md` and `back-office/CONTEXT.md` and the ADRs in `docs/adr/`. Report findings as proposed prompts/follow-ups — never as edits you're about to make.
