---
name: commit
description: Review, validate, stage, and commit a single logical Pilates project change. Use for every commit and whenever a user asks to commit, save, or record changes in Git.
---

# Commit workflow

This workflow is mandatory for every commit, regardless of AI tool. Invoke it as `$commit` in Codex, `/commit` in clients that expose slash skills, or follow these instructions directly when native invocation is unavailable.

## 1. Review the worktree

Run `git branch --show-current` first. If it prints `main`, stop: commits on `main` are not allowed (see the coding standards' «Branches and pull requests»); create or switch to the item's branch and start again.

Run `git status` and inspect both staged and unstaged diffs. Distinguish changes made for the current task from pre-existing user work. Never modify, discard, stage, or commit unrelated changes.

## 2. Enforce atomicity

A commit contains one logical change. If unrelated changes exist, commit only the current logical group. If ownership or grouping is unclear, stop and ask the user which group to commit.

Atomic means the commit has one purpose and can be reviewed, reverted, or
cherry-picked without carrying a separate decision with it. Multiple files are
allowed when every file is required for that one purpose; proximity in time or
work on the same backlog item is not enough to combine changes.

Before staging, describe the intended commit in one short sentence. If that
sentence needs “and” to join independently useful outcomes, split the work. In
particular, keep these checkpoints separate when they can stand alone:

- recording a proposal or approval;
- adding or upgrading a dependency;
- committing a generated schema or migration review artifact;
- adding a failing test;
- implementing the behavior that makes the test pass;
- refactoring green code; and
- marking a backlog item complete with its evidence commit.

For example, approving a pg-boss proposal, pinning pg-boss, and recording its
generated schema are three commits when each is independently reviewable and
revertible. Do not bundle them merely because they contribute to the same
backlog item.

Immediately before `git commit`, inspect `git diff --cached --name-status` and
`git diff --cached`. If the staged diff contains more than one independently
revertible outcome, unstage the extra paths and commit each outcome separately.

For TDD work, preserve the project's Red → Green → Refactor history: commit an intentional failing test separately when the workflow calls for a red checkpoint, commit the minimal passing implementation after green, and commit a subsequent refactor separately.

## 3. Validate before staging

Run only the tests and checks relevant to the logical change. Use the full suite only for cross-cutting changes. Do not commit when a relevant check fails; report the failure and stop.

Lint every staged TypeScript file with its package's ESLint before staging,
for example `pnpm --filter @pilates/backend exec eslint <paths>` from the
repository root. In `apps/backend` formatting is a lint error (ESLint runs
Prettier), so this is also the format check; `apps/admin-web` keeps a separate
`format:check`. A file that fails lint is not committed, whatever the tests
say: nine backend files committed on 2026-09-21 and 2026-09-22 without this
step left `pnpm --filter @pilates/backend lint` red until BE-015.

Documentation-only changes do not require invented tests. Run whitespace, link, schema, or skill validation appropriate to the edited documents.

## 4. Stage explicit paths

Stage only reviewed files belonging to the logical change. Never use `git add .`, `git add -A`, a repository-wide glob, or a broad generated-output directory. Reinspect the staged diff and run `git diff --cached --check` before committing.

## 5. Write the message

The message must be:

- lowercase;
- one line;
- short and descriptive;
- free of `type:` prefixes and hyphen separators; and
- free of `Co-Authored-By`, AI attribution, or generated-by claims.

Example: `record pilates coding standards`.

## 6. Commit and confirm

Create the commit only after all previous gates pass. Then run `git status` and inspect the latest commit summary to confirm the intended paths were committed and unrelated work remains untouched.
