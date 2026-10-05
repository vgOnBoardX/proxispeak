# ProxiSpeak: standing rules for every agent

## Source of truth
- Read `docs/PROJECT_SPEC.md` at the start of every task. It overrides your assumptions.
- If a request conflicts with the spec, stop and ask. Do not silently deviate.
- Work only on the current phase. No features from later phases, no speculative refactors.

## Process
- Always produce an Implementation Plan and a Task List before editing code. Keep the Task List updated as you go.
- Work in small verified steps. After each task run typecheck, lint, and the relevant tests.
- Never mark a task done without evidence (test output, command output, or a browser recording/screenshot).
- When a phase finishes, produce a Walkthrough artifact: what changed, how it was verified, how to run it, known gaps.
- Make one git commit per completed task using conventional commits (feat:, fix:, test:, chore:, docs:).

## Code quality
- TypeScript strict mode. No `any`, no unchecked `as` casts at trust boundaries.
- Validate every HTTP body and every socket payload with zod schemas from `shared/`.
- All constants (radii, rates, limits) come from `shared/src/constants.ts`. No magic numbers.
- Do not invent APIs. If unsure about a library's API, read the installed package's types or docs first.
- Do not add dependencies that are not in the spec without asking and justifying.

## Performance rules (non-negotiable)
- The canvas game loop lives outside React state: use refs and `requestAnimationFrame`.
- No allocations inside the per-frame render loop.
- Never write to MongoDB per movement event. Positions are buffered in memory and flushed in batches.
- Never block the Node event loop with synchronous heavy work.

## Safety
- Never run destructive commands: `rm -rf` outside `node_modules`/`dist`, `git push --force`, `docker system prune`, or dropping any database other than `proxispeak_dev` and `proxispeak_test`.
- Never commit secrets. Use `.env` (gitignored) and keep `.env.example` current.
- Do not modify files outside this workspace.
