# AI contributor guide

This is the tool-neutral entrypoint for any AI-assisted work in this repository. Project skills are plain Markdown under `.agents/skills/`; read the relevant skill completely before acting, whether or not the current AI supports native skill discovery or slash commands.

## Read first

- [Context Map](./CONTEXT-MAP.md) lists the bounded contexts and links to each context's glossary (`CONTEXT.md`) and ADRs. Read the affected context before touching business logic or domain terms.
- [Architecture roadmap](./docs/architecture/README.md) shows the current architecture focus, accepted coverage, and ordered queue of unresolved decisions.
- [Architecture decisions](./docs/adr/) record accepted technical and product constraints. Read the relevant ADRs before changing architecture or implementation boundaries.
- [Design](./docs/design/) contains the design-system reference and per-screen prompts; [`docs/design/prompts/README.md`](./docs/design/prompts/README.md) is the screen index and [`design/README.md`](./design/README.md) is the generated handoff specification.

## Project skills

- [`coding-standards`](./.agents/skills/coding-standards/SKILL.md) is always active for code, tests, database work, business logic, and engineering documentation.
- [`commit`](./.agents/skills/commit/SKILL.md) is mandatory for every commit. Invoke `$commit` in Codex, `/commit` in clients that expose slash skills, or follow the linked workflow directly when native skill invocation is unavailable.
- [`design-workflow`](./.agents/skills/design-workflow/SKILL.md) is mandatory before inspecting or changing design prompts or generated design output.
- [`bootstrap-standards`](./.agents/skills/bootstrap-standards/SKILL.md) applies only when importing or resynchronizing engineering standards from another repository.

## Generated design output

**Never edit or revert anything under `design/` by hand.** It is generated output. Every screen change goes through a prompt or follow-up in `docs/design/prompts/` according to the `design-workflow` skill.
