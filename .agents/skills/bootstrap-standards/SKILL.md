---
name: bootstrap-standards
description: Import and adapt engineering standards from a mature source repository into this repository's tool-neutral AGENTS.md and .agents/skills files. Use only when asked to bootstrap or resynchronize project standards from another codebase.
---

# Bootstrap project standards

Create AI-tool-neutral project governance. Write the universal entrypoint to `AGENTS.md` and reusable skills to `.agents/skills/`; never create instructions that require one AI vendor to understand the project.

## Adapt instead of copying

Classify every source rule before bringing it into this repository:

1. **Portable as-is:** process or architecture principles independent of language and framework.
2. **Portable after adaptation:** a useful principle whose concrete mechanism must match this project's accepted stack and ADRs.
3. **Not portable:** source-product business rules, source-specific vocabulary, and library requirements that this project has not selected.

Only the first two categories belong in this repository. Product rules must come from this project's bounded-context documents, never from the source repository.

## Workflow

1. Read the source repository's contributor instructions, linked skills, architecture documents, and relevant ADRs completely.
2. Read this repository's `CONTEXT-MAP.md`, context glossaries, ADRs, existing `AGENTS.md`, and project skills.
3. Confirm stack choices needed to adapt concrete rules. If an unresolved choice would materially change a rule, ask rather than inventing a placeholder standard.
4. Draft changes to `AGENTS.md` and the relevant `.agents/skills/*/SKILL.md` files. Keep each skill focused and self-contained.
5. Show the proposed rule categories and substantive wording before overwriting an established standard unless the user has already approved the exact migration.
6. Validate skill frontmatter, links, portability, and consistency with accepted ADRs.

Do not write to the source repository. Do not import its business terminology. Do not add vendor-specific discovery metadata unless the user explicitly requests an optional adapter that leaves the tool-neutral files authoritative.
