# AGENTS.md

Instructions for any coding agent other than Claude Code (Codex, OpenCode, Cline and the
like). In this repository your job is **code analysis**: read the code, find problems and write
a report. Claude Code does the development work and follows `CLAUDE.md`.

## What you may write

- **Only inside `code-analysis/`.** Do not change any other file, including to fix what you
  find. Fixes are made separately, from your report
- `dev-notes/` belongs to Claude Code. Read it if useful (a snagging list or project tracker, if
  present, lists known issues already agreed), but never write to it
- If `code-analysis/` doesn't exist, create it
- Don't commit, stage or push anything. The maintainer decides what goes into git

## Context

Read `CLAUDE.md` first, but only for what this project is: its architecture, request flow, key
files, high-impact code and public contracts. Its working rules are for Claude Code, not you.
`docs/` describes the project's behaviour for operators, API consumers and developers.

This is a Node.js project in TypeScript. The Node floor is `engines.node` in `package.json`.
`src/config.ts` is the only module that reads the environment or config files. You may run the
project's read-only checks (`npm run typecheck`, `npm run lint`, `npm test`) if dependencies are
installed; never install, update or remove packages.

## What to look for

In order of priority:

1. **Security:** missing authentication or authorisation checks, injection (SQL built by string
   concatenation instead of bound parameters, shell commands built from input, path traversal),
   unvalidated input reaching a service, secrets logged, stored or compared unsafely (use a
   constant-time comparison), open redirects, permissive CORS, SSRF from user-supplied URLs
2. **Correctness:** logic errors, unhandled failure paths (a rejected promise not awaited, a
   `null` or `undefined` used as if it were a value), race conditions, work that must run once
   running on every clustered process, wrong behaviour at boundaries
3. **Robustness:** code that fails open where it should fail closed, errors caught and dropped
   without a trace, configuration that silently falls back on a bad value, resources (database
   connections, timers, file handles) not released on the failure path

Not style, formatting or naming; lint covers those. Not features the project could have.
Check each finding against the code before reporting it, and drop any you can't support with a
concrete failure.

## The report

One Markdown file per run: `code-analysis/YYYY-MM-DD-<scope>.md`, where `<scope>` is a short
slug (`full`, `auth`, `cli`). Never edit or overwrite an earlier report; a second run on the
same day adds a suffix (`-2`).

Start with the date, the commit analysed (`git rev-parse --short HEAD`), the agent and model,
and what was in scope. Then one section per finding, most severe first:

```markdown
## 1. Short title

- **Severity:** critical | high | medium | low
- **Location:** `src/services/example.ts:123`
- **Problem:** one or two sentences
- **Failure scenario:** the concrete input or state, and what goes wrong
- **Suggested fix:** brief; no patch needed
```

End with anything checked and found sound, briefly, so the next run needn't repeat it.
Reports can describe unfixed vulnerabilities: `code-analysis/` is never committed to a github.com
repository and never published.
