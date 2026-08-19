---
name: commit
description: Review, validate, stage, and commit a single logical Pilates project change. Use for every commit and whenever a user asks to commit, save, or record changes in Git.
---

# Commit workflow

This workflow is mandatory for every commit, regardless of AI tool. Invoke it as `/commit` when slash skills are supported; otherwise follow these instructions directly.

## 1. Review the worktree

Run `git status` and inspect both staged and unstaged diffs. Distinguish changes made for the current task from pre-existing user work. Never modify, discard, stage, or commit unrelated changes.

## 2. Enforce atomicity

A commit contains one logical change. If unrelated changes exist, commit only the current logical group. If ownership or grouping is unclear, stop and ask the user which group to commit.

For TDD work, preserve the project's Red → Green → Refactor history: commit an intentional failing test separately when the workflow calls for a red checkpoint, commit the minimal passing implementation after green, and commit a subsequent refactor separately.

## 3. Validate before staging

Run only the tests and checks relevant to the logical change. Use the full suite only for cross-cutting changes. Do not commit when a relevant check fails; report the failure and stop.

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
