---
name: design-workflow
description: Protect and evolve this repository's generated design screens through source prompts and follow-ups. Read before inspecting design output, changing design prompts, or fixing any screen under design/.
---

# Design workflow

This workflow is independent of the design-generation tool or AI assistant being used.

## The one rule

**Never modify anything under `design/`.** Not the `.dc.html` screens, not `Sistema de Diseño.dc.html`, and not `design/README.md`. They are exported generated artifacts.

That includes:

- No direct write, even for a one-word copy fix or obviously stale value.
- No checkout, restore, revert, or generated-file cleanup under `design/`, even when an export regresses.
- No bulk staging command pointed at `design/`. Stage explicit generated paths only when the user specifically asks to record an export.

The design session and its source prompts are the source of truth. A manual generated-file edit is overwritten by the next export and makes the repository diverge from that source.

## Change an existing screen

1. Write a focused delta in `docs/design/prompts/followups/NN-slug.md` using the next free number.
2. Add a `Targets:` line, explain the discrepancy and its governing context or ADR, specify only the required change, and state what must remain untouched.
3. Add the follow-up to the table in `docs/design/prompts/README.md` with status `🕓 pending`.
4. Hand the prompt to the user for the existing design session unless the user has explicitly authorized access to that external tool.
5. After a new export, verify the generated artifacts against the prompt and standing invariants before changing the status to `✅ applied`.

Never edit an already-generated screen's original full prompt. Follow-ups preserve the history of applied changes.

## Add a new screen

Write a full prompt at `docs/design/prompts/{client,staff,admin-web}/NN-slug.md`, following the established prompt structure, and add it to the corresponding index table as not yet generated.

## Audit designs

Compare generated screen text and behavior with the glossaries in `booking/CONTEXT.md` and `back-office/CONTEXT.md`, relevant ADRs, and the standing invariants checklist. Report discrepancies as proposed prompts or follow-ups, never as direct edits to generated output.
