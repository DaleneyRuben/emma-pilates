---
name: bootstrap-standards
description: Carries over coding standards, workflow rules, and architecture principles from an existing project (e.g. catering-manager) into THIS project's CLAUDE.md, adapted for this project's own stack. Use this whenever the user asks to "set up CLAUDE.md", "bootstrap standards", "bring over the rules from catering-manager", "carry over our coding standards", or is clearly starting fresh governance docs for this repo and references another project as the source. Also trigger if the user asks to update or re-sync this project's standards after the source project's own rules have changed. Do not use this for writing the actual business-rules/domain doc for this project — that's product-specific and has no source to extract from.
---

# Bootstrap standards from a source project

This project (Pilates) is new. Rather than write its coding standards from scratch, pull them
from a source project that already has mature ones — by default `catering-manager`, since that's
the project this skill was extracted from — and adapt them to this project's own stack.

The output is a `CLAUDE.md` (and, if the ruleset is long enough to warrant it, a linked
`.claude/skills/project-standards/SKILL.md`) written into **this** project only. Never write
anything back into the source project.

## Why a three-bucket sort, not a copy-paste

A mature project's `CLAUDE.md` is a mix of things that generalize and things that don't. Copying
it wholesale imports assumptions that won't fit a different stack (a rule that says "use Tailwind
tokens" is dead weight in a React Native app with no CSS), and skipping the exercise entirely
throws away real, hard-won process discipline (TDD-as-a-gate, atomic commits, domain ownership)
that has nothing to do with which framework either project happens to use.

Sort every rule you find into one of three buckets:

1. **Portable as-is** — process and architecture principles that don't reference any specific
   library. Carry these over close to verbatim. Typical examples: TDD as a hard gate (write a
   failing test before any implementation code), atomic commits, GitHub Flow with merge-commit-only
   merges, "ask before changing business logic," a file-size cap that forces decomposition, DRY,
   reuse-before-creating, separation of concerns, and a backend domain-ownership model (one
   function per file, exactly one domain writes each table, domain APIs expose intentions not
   fields) — none of that cares whether the ORM is Sequelize or Prisma.

2. **Portable but needs re-deriving** — the underlying principle holds, but the concrete mechanism
   is stack-specific and has to be restated in the new stack's terms, not quoted. Typical examples:
   feature-folder colocation (becomes `screens/` + navigation instead of `pages/` + routes in React
   Native), "verify end-to-end before calling it done" (the gate is the same, but Playwright for a
   web app becomes Detox/Maestro/a simulator walkthrough for a mobile app), "always use one
   canonical interactive primitive, never a raw element" (`Button` vs `<button>` becomes a shared
   `Pressable`/`TouchableOpacity` wrapper), and "use the project's established library for X
   consistently" (state the principle; let the target project's own chosen library fill in X —
   don't propagate the source project's specific package name as if it were the rule).

3. **Not portable — leave behind** — anything that's actually product/domain knowledge dressed up
   as a coding standard, or that hardcodes the source project's specific tech choice as *the*
   answer rather than as an example. Typical examples: a linked business-rules doc (e.g.
   `docs/business-rules.md` describing what a "client" or "subscription" means in the source
   project's business — that's the other project's product, not a coding standard), a
   language/locale convention that only exists because that project is bilingual, and rules that
   name a specific library (Tailwind, TanStack Query, Sequelize) as a requirement rather than as
   "whatever this project's established choice is."

When in doubt about which bucket a rule belongs in, ask: "does this sentence change if I swap the
frontend framework?" If yes, bucket 2 or 3. If the sentence is *only* true because of this
project's specific domain (catering, delivery zones, meal plans), it's always bucket 3, no matter
how it's phrased.

## Steps

1. **Read the source project's rules.** Read its `CLAUDE.md`, and follow every `@`-import and
   linked doc it references (a linked skill file, an architecture doc, an ADR). Do not stop at the
   top-level file — the source project may keep the bulk of its concrete rules in a linked skill,
   the way `catering-manager` keeps the tech-stack/architecture rules in
   `.claude/skills/project-standards/skill.md` and links it from `CLAUDE.md`.

2. **Confirm this project's stack choices before drafting.** You cannot re-derive bucket-2 rules
   without knowing what they're being re-derived *into*. If any of the following aren't already
   established in this repo (check for a `package.json`, existing config, or prior conversation),
   ask the user rather than guessing:
   - Frontend framework/library and its state-management / data-fetching approach
   - Styling approach (CSS-in-JS, StyleSheet, a utility framework, design tokens)
   - Backend framework and ORM/DB, if applicable
   - The end-to-end verification tool (Playwright only applies to web — a mobile app needs its own
     answer: Detox, Maestro, manual simulator walkthrough, etc.)
   - Testing frameworks for unit/component tests
   - Any language/locale requirements specific to this project (don't assume none — ask)

3. **Apply the three-bucket sort** to everything you read in step 1, using this project's answers
   from step 2 to fill in bucket-2 rules. Keep a running list as you go — this becomes the basis
   for the new `CLAUDE.md`.

4. **Draft the new project's `CLAUDE.md`.** Mirror the source's shape only if it fits: a short
   top-level file with git workflow, testing gate, and other cross-cutting process rules, plus a
   linked project-standards skill file for the denser architecture/tech-stack rules if the list is
   long enough to warrant splitting (roughly: if the top-level file would exceed a screen or two,
   split it, following the same pattern this skill's `SKILL.md` documents). Write only bucket 1 and
   the re-derived bucket 2 rules. Never include a business-rules doc — that's product-specific and
   this project doesn't have a source to extract it from; if this project needs one, it gets
   written from scratch based on *this* project's actual domain, not extracted.

5. **Show the draft before writing it, or before overwriting an existing `CLAUDE.md`.** This file
   sets the ground rules for every future session in this project — treat a first write the same
   as any other foundational decision and let the user sign off on the bucket sort and the wording
   before it lands, rather than committing it silently.

## What NOT to do

- Don't quote the source project's specific business rules, even as an "example" — a rule that
  says "e.g. how Client/Subscription pricing works" leaks the other project's domain into this
  one's governance doc for no reason.
- Don't leave a bucket-2 rule referencing the source project's library name because the target
  choice wasn't decided yet — ask first (step 2), don't placeholder it and move on.
- Don't merge this with writing the actual product/business-rules doc for Pilates. That's a
  separate, from-scratch exercise once the product itself is defined.
