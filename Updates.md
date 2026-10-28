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

## 2026-10-28 18:55 (Asia/Riyadh)

**Update:** Replaced the two-process development setup for the shared preview with a single production server on port 5352. It serves the built UI and places API from one process, returns the app shell for direct UI routes such as `/rewards/wheel`, and keeps unknown API paths as 404 responses. Fixed the Windows static-root path check after the first restart blocked UI files. Added route regression tests.

**Validation:** Production build passed. Five Node tests passed. Network requests to `/`, `/rewards/wheel`, and `/api/health` at `172.20.10.5:5352` returned 200; health reported 208 places.

**Open items:** The running preview depends on this machine remaining on and its IP remaining reachable. Banking and wallet features remain fictional demo behavior.

Tool: Codex — Developer: Codex

## 2026-10-28 18:56 (Asia/Riyadh)

**Update:** Set the production UI asset base to `/` so direct links such as `/rewards/wheel` load their JavaScript and styles from the server root. Rebuilt the UI while the single-process server continued serving port 5352.

**Validation:** Production build and five Node tests passed. A network request to `/rewards/wheel` returned 200, and the JavaScript asset referenced by that page also returned 200.

**Open items:** Browser state remains in-memory demo state. The server is running on this machine and is not a managed deployment.

Tool: Codex — Developer: Codex

## 2026-10-28 19:26 (Asia/Riyadh)

**Update:** Merged `origin/Alsehli` (new UI, flying camel game) into `Meshal` after fast-forwarding to `origin/Meshal`; resolved conflicts by keeping the Places route and taking Alsehli's newer games page, mascot tile and styles. Built the backend from `Plan.md`: a Users database with the five accounts (Abdullah M, Abdullah S, Meshal, Sultana, Rasel), name + 4-digit PIN sign-in (scrypt hashes, signed tokens, lockout), balances and 60 days of categorised spending each, and friend groups; a Games database with Flappy Bird and who-pays-the-bill sessions (random order, highest points pays, bill charged to the payer); the Places and Categories database with the 7 templates. Added the AI Analyst (`server/analyst.mjs`, `src/screens/Analyst/`) using the supplied pixel character: insights, overspending and subscription alerts, a daily plan from a wallet-limited budget slider, and a group hangout plan built on the smallest budget without revealing anyone's numbers. Wired the UI to the API (sign-in, live balance and history, top-ups, transfers between users, checkout, salary, cashback). Removed all "Demo" naming from the app. To stop the UI breaking when the backend changes: the API now runs inside the Vite dev server with per-request module reload, all calls go through one client with timeouts and readable errors, screens show retry states, an error boundary wraps routes, and `npm start` rebuilds before serving. Live databases are in `data/db/` (git-ignored) and are created from `server/seed.mjs` on first run.

**Validation:** `npm run build` passed (strict TypeScript). 14 backend tests passed (`npm test`). 17 Playwright browser tests passed (`npm run test:e2e`), including sign-in, persisted balances, transfers between accounts, the Analyst slider and plans, a simulated API outage, and a check that no "Demo" text remains. Manually confirmed that a syntax error in a backend file shows an error state in the UI and recovers on retry without a restart. Production server checked on a spare port: `/`, `/analyst`, `/rewards/wheel` and `/api/health` returned 200.

**Open items:** The Points Challenges games do not yet report scores to game sessions; the Games database holds one game (Flappy Bird) as planned. The Analyst is rule-based and does not call a language model. Cards, Market products and rewards progress are still local UI state. The Alsehli merge is committed on `Meshal`; the backend and UI changes are not committed or pushed yet.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-28 20:17 (Asia/Riyadh)

**Update:** Connected the AI Analyst to Claude through the Claude-Dev endpoint used by The Ring (`https://claudeapikey.dev`, model `claude-haiku-4-5`, key from the `CLAUDE_DEV_KEY` environment variable, never stored in the repo). Added `@anthropic-ai/sdk` and `server/claude.mjs`. The endpoint ignores `output_config` and replaces client tools, so JSON is requested in the prompt and every answer is validated on the server (place ids must exist, prices come from the database, totals stay within budget, one retry). Removed the analyst's canned rule-based headlines, tips and plan picker; the computed spending facts remain and Claude writes the advice and chooses the plans. Added a fourth database, Payments (`data/db/payments.json`), and Market → Pay at places to buy from any of the 208 places in the Categories database with an editable date, saved as name, price, category and date. Added the "BarQ Developers" group with all five users (existing databases are migrated on start) and `POST /api/groups/:id/members` with an Add control in the Analyst's Hangout tab. Raised the places list limit to 250 so all 208 places can be listed.

**Validation:** TypeScript build passed. 19 backend tests passed, using a local stand-in for Claude. 20 Playwright tests passed in three consecutive full runs; one earlier run had a single failure in the narrow-screen layout test that could not be reproduced in 8 repeats. Live check against the real endpoint: advice and a SAR 140 daily plan returned valid JSON in about 8 seconds, with database prices and a total within the budget.

**Open items:** The Claude-Dev endpoint is a third-party proxy, not Anthropic's API; its latency has varied from seconds to over a minute in The Ring's tests. The Ring repository was read only and not changed. Not committed yet.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-28 20:35 (Asia/Riyadh)

**Update:** Removed all mock data. Accounts now start with zero balance, savings and cashback, no transactions and no budgets; the 60-day spending generator, the sample groups (The Shilla, Weekend crew, Study group) and the in-app sample records (youth account, salary payee, marathon ranking, savings goal) are gone. The live databases were reset to this empty state. Kept: the five logins, the BarQ Developers group, the Flappy Bird game entry, the Places and Categories data, and the Market product catalog and card designs. Added "Who's paying?" hangout votes (`server/hangouts.mjs`, `/api/hangouts`): each member votes split, own, or "I will pay it". One volunteer pays; two or more volunteers play Flappy Bird and the highest score pays; otherwise the majority decides and a split/own tie means everyone pays their own. Points Challenges now opens Flappy Bird directly and reports the final score to the app for these games. Payments for hangouts are charged to wallets and saved in the Payments database.

**Validation:** TypeScript build passed. 24 backend tests passed, including all three voting scenarios, the split majority, and vote validation. 23 Playwright tests passed in two consecutive runs, including the volunteer, game, and tie flows in the browser.

**Open items:** Deployment to the ring server follows in the next entry.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-28 20:43 (Asia/Riyadh)

**Update:** Deployed BarQ to the ring server (`ssh ring`) as a Docker container named `barq`, following the existing pattern there: source in `~/barq/app`, `~/barq/compose.yml`, bound to `127.0.0.1:5352`, `restart: unless-stopped`, and the databases on the `barq_barq-data` volume. Added `Dockerfile`, `.dockerignore`, `deploy/compose.yml` and `deploy/deploy.sh` (deploys the committed HEAD). No other container or service on the server was changed.

**Validation:** The container reports healthy. On the server, `/`, `/analyst` and `/api/health` returned 200, the five accounts are listed, and sign-in works. Checked in a browser through an SSH tunnel: Meshal signs in with a SAR 0.00 balance.

**Open items:** Not public yet: it needs a public hostname route added to the server's Cloudflare tunnel (managed in the Cloudflare dashboard). The AI Analyst is not connected on the server until `CLAUDE_DEV_KEY` is put in `~/barq/.env` and the container is restarted. Nothing has been pushed to GitHub.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)
