# BarQ — Plan

## Purpose

The shared project roadmap and decision register for BarQ. This file tracks agreed work; it is **not** a claim that the tasks below have already been implemented.

## Current baseline

- Repository: [BarQ](https://github.com/Mishooooo0/BarQ)
- Canonical integration branch: `main`
- Shared team documents at the repository root: `Plan.md`, `Part.md`, and `Updates.md`
- Product scope, technology stack, delivery milestones, and release criteria: **to be confirmed by the team**

## Roadmap

| Phase | Work | Deliverable | Status |
| --- | --- | --- | --- |
| 1 — Define | Agree on BarQ's goal, users, scope, constraints, and success measures | Approved requirements and acceptance criteria | Not started / unconfirmed |
| 2 — Design | Agree on architecture, interfaces, data model, security, and UX as applicable | Reviewed technical and design plan | Not started / unconfirmed |
| 3 — Build | Break features into owned tasks and implement in branches | Reviewed, tested changes | Not started / unconfirmed |
| 4 — Validate | Run relevant automated tests, reviews, security checks, and end-to-end checks | Evidence against acceptance criteria | Not started / unconfirmed |
| 5 — Release | Integrate approved changes into `main`, document release and rollback | Release checklist and version notes | Not started / unconfirmed |

## Working process

1. Capture an item with an owner, priority, dependencies, and a clear acceptance check before moving it to **In progress**.
2. Use `Part.md` for responsibility and handoff tracking; do not assume a branch name proves ownership.
3. Work in the relevant branch and submit changes to `main` through a reviewed merge or pull request. Avoid overwriting unrelated branch history.
4. Keep plans and shared logs consistent across branches. Make edits to the canonical docs on `main`, then bring those edits into branch copies.
5. Append a timestamped record of meaningful work and decisions to `Updates.md`. Do not rewrite old entries.
6. Record completed tests and known limitations rather than claiming completion without evidence.

## Task template

```markdown
### [Task ID] Task title
- Owner:
- Branch:
- Priority:
- Status: Planned | In progress | Blocked | In review | Done
- Dependencies:
- Acceptance criteria:
- Validation:
- Notes:
```

## Decisions / open questions

| Topic | Decision or question | Owner | Status |
| --- | --- | --- | --- |
| Product requirements | What is the agreed goal and MVP for BarQ? | Unassigned | Open |
| Architecture | What stack, integrations, and deployment approach will be used? | Unassigned | Open |
| Team coordination | Who owns which workstream and branch? | Unassigned | Open |
| Milestones | What dates and release gates apply? | Unassigned | Open |

Update this file when decisions are made, and log consequential changes in `Updates.md`.
