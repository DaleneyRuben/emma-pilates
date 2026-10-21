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
- No bulk staging command pointed at `design/`. Stage explicit generated paths only, and only when committing an export made through «Run the export» below.

The design session and its source prompts are the source of truth. A manual generated-file edit is overwritten by the next export and makes the repository diverge from that source.

## Change an existing screen

1. Write a focused delta in `docs/design/prompts/followups/NN-slug.md` using the next free number.
2. Add a `Targets:` line, explain the discrepancy and its governing context or ADR, specify only the required change, and state what must remain untouched.
3. Add the follow-up to the table in `docs/design/prompts/README.md` with status `🕓 pending`.
4. Run the export yourself (see «Run the export» below). The user authorized this on 2026-09-28 and re-approved it on 2026-09-30 on one condition: everything created in Claude Design is deleted once the export is done.
5. After the export, verify the generated artifacts against the prompt and standing invariants before changing the status to `✅ applied`.

## Never edit a sent prompt

Once a full prompt or follow-up has been sent to a design session (applied on a canvas), it is frozen, and so is the standing invariants checklist. A correction to it, even of a fact it got wrong, goes into a **new**, higher-numbered follow-up that states the correction explicitly («from here on, read X instead of Y»). Only the status and notes columns of the index in `docs/design/prompts/README.md` stay editable, because the index is bookkeeping, not a sent artifact. A follow-up written in the current session and not yet sent may still be corrected.

## Run the export

Claude Design is the Artifact tool's Design type; the Pilates design system is `design/Sistema de Diseño.dc.html` and the existing screens, never an organization default design system.

1. Create a Design canvas and seed it with the affected screens copied unchanged from `design/` (canvas-safe names: ASCII, no spaces), with their support files.
2. Apply the follow-up on the canvas as a second publish of the edited screens, and check the rendered result against the prompt and the standing invariants.
3. Read the artboards back and copy them into `design/` under the repository's file names. Run `git diff --check` on them and commit the export separately from prompt and index changes, staging explicit paths.
4. Delete the canvas, then list your own artifacts to confirm nothing created in Claude Design is left.

If a permission check refuses creating the canvas, do not work around it: stop, leave the follow-up `🕓 pending`, and say so in the handoff.

## Add a new screen

Write a full prompt at `docs/design/prompts/{client,staff,admin-web}/NN-slug.md`, following the established prompt structure, and add it to the corresponding index table as not yet generated.

## Audit designs

Compare generated screen text and behavior with the glossaries in `booking/CONTEXT.md`, `back-office/CONTEXT.md`, and `system-identity/CONTEXT.md`, relevant ADRs, and the standing invariants checklist. Report discrepancies as proposed prompts or follow-ups, never as direct edits to generated output.
