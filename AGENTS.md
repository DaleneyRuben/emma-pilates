# Agents

Domain vocabulary and architectural decisions for this project live outside this file — read them before touching business logic or domain terms.

- [Context Map](./CONTEXT-MAP.md) — lists this project's bounded contexts and where each one's glossary (`CONTEXT.md`) and ADRs live.
- [Design](./docs/design/) — design system reference and per-screen prompts for the client, staff, and admin-web surfaces; see [`docs/design/prompts/README.md`](./docs/design/prompts/README.md) for the screen index and [`design/README.md`](./design/README.md) for the built-screen handoff spec.
- **`design/` is generated output from Claude Design and is never edited or reverted by hand** — every change to a screen goes through a prompt or follow-up in `docs/design/prompts/`. See the [`design-workflow`](./.claude/skills/design-workflow/SKILL.md) skill.
