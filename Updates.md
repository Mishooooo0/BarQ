# BarQ — Updates

This is the shared, chronological project change log. It follows the append-only approach used by Dhamantaha and NIO-Book.

## Rules

1. **Append only.** Never delete, overwrite, reorder, or silently edit an existing update. If something needs correction, append another entry.
2. Add an entry whenever implementation, documentation, testing, deployment, or project decisions change.
3. Use the actual local date and time in **Asia/Riyadh** (`YYYY-MM-DD HH:mm`). Do not guess a timestamp.
4. Record what changed, why (when relevant), validation/results, and anything not completed or verified.
5. Attribute the **tool** and **developer** responsible for the work. Never claim another developer's work as your own.
6. Do not put passwords, tokens, API keys, personal data, or other secrets in updates.
7. Keep this file synchronized across `main` and all active branches. `main` is the canonical copy; reconcile concurrent appended entries without dropping any.

## Entry template

```markdown
## YYYY-MM-DD HH:mm (Asia/Riyadh)

**Update:** Briefly describe the work, decisions, and files affected.

**Validation:** Tests or checks run, or "Not run" with a reason.

**Open items:** What remains, or "None".

Tool: <tool name> — Developer: <developer name>
```

## 2026-10-28 15:04 (Asia/Riyadh)

**Update:** Established the three root-level shared documentation files for BarQ: `Updates.md` (append-only change history), `Plan.md` (project roadmap and decisions), and `Part.md` (ownership and team handoffs). The format of this log was informed by the Dhamantaha and NIO-Book update logs. Published the starting documents to `main` for distribution to the existing branches.

**Validation:** Documentation-only initialization; no application tests run.

**Open items:** Confirm product requirements, technical implementation details, task owners, and milestone dates.

Tool: ChatGPT — Developer: Unassigned (documentation initialization requested by repository owner)

## 2026-10-28 18:38 (Asia/Riyadh)

**Update:** Created a local `integration/barq` branch from `main` and merged the locally available `Alsehli` and `Almalki` refs. Retrieved the latest three JSONL place files from the remote `Almalki` branch; their Git blob hashes match the remote files. Added a read-only Node API for health, category counts, place search/filter/pagination, and place lookup. Connected a Riyadh Places screen in the available UI branch to that API. The original checkout and remote `main` were not changed.

**Validation:** Three Node API tests passed. The API loaded 208 records in seven categories. Frontend build was attempted but could not run because dependencies are absent; offline `npm ci` failed due to a missing cached package.

**Open items:** The local branch refs are behind the remote branches, so this is not yet a merge of the latest UI and database commits. Install frontend dependencies, run the UI build and end-to-end checks, refresh both branches, implement the remaining user/game/payment backend contracts, and review before merging to remote `main`.

Tool: Codex — Developer: Codex

## 2026-10-28 18:47 (Asia/Riyadh)

**Update:** Moved the integration onto `Meshal` and deleted the temporary `integration/barq` branch. Brought in the current `Alsehli` Points Challenges page and route alongside the places API and all three `Almalki` datasets. Added browser checks for the Places and Points Challenges flows. All new work remains on `Meshal`; `main` was not changed.

**Validation:** `npm ci` completed with zero reported vulnerabilities. `npm run build` passed. Three Node API tests passed. All 13 Playwright browser tests passed, including the two integration checks.

**Open items:** The app remains a fictional prototype. Wallet state is in-browser mock data, the places API is read-only, and no real banking authentication, payment processing, or persistent user/game data is implemented. Review these contracts before treating it as a production banking backend.

Tool: Codex — Developer: Codex
