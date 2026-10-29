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

## 2026-10-28 19:05 (Asia/Riyadh)

**Update:** Fixed the white-screen crash in demo top-up and store checkout on the LAN HTTP address. The UI used `crypto.randomUUID()`, which is unavailable in that browser context; demo transaction IDs now use `crypto.getRandomValues()` with a safe demo fallback. Added a browser regression test for that environment. Confirmed the bootcamp scope: no real banking or payment integration.

**Validation:** Rebuilt the UI, reproduced and completed a SAR 100 fictional top-up in the in-app browser without a new error, and passed all 14 Playwright tests. The places screen remains connected to the 208-record API.

**Open items:** Only the places dataset is connected to the server API. Wallet, top-up, checkout, rewards, and games still use fictional client-side state; there is no user or game database in the supplied `Almalki` branch.

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

## 2026-10-28 20:40 (Asia/Riyadh)

**Update:** Correction to the previous entry: its timestamp should read 2026-10-28 20:39, not 20:43.

**Validation:** Not applicable (log correction).

**Open items:** None.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-28 20:43 (Asia/Riyadh)

**Update:** Made BarQ run 24/7 in containers on both machines. Ring: the `barq` container now uses `restart: always` and stores its databases in `~/barq/data` on the host (bind mount) instead of a Docker volume, so redeploys, rebuilds and `docker compose down` keep the data; the existing data was copied over first. `deploy/deploy.sh` prepares that folder. This PC: added a root `compose.yml`; BarQ now runs as the `barq-local` container on 127.0.0.1:5352 (replacing the background Node process), with the databases in `data/db` and `CLAUDE_DEV_KEY` passed from the local environment.

**Validation:** Ring: restart policy `always`, bind mount confirmed; a session token issued before the redeploy still worked after it; after killing the BarQ process to simulate a crash, Docker restarted it automatically (restart count 1) and the token still worked. Docker is enabled at boot on ring. Local: the container is running with policy `always`, reports healthy with the AI connected, and reads the same `data/db/users.json`.

**Open items:** On this PC, Docker Desktop's "start when you sign in" is off, so the local container will not start after a Windows restart until Docker Desktop is opened. The old `barq_barq-data` volume on ring is no longer used and was left in place. The ring copy still needs a Cloudflare tunnel route to be public and `CLAUDE_DEV_KEY` in `~/barq/.env` for the AI.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-28 21:01 (Asia/Riyadh)

**Update:** Ran The Ring's Claude-Dev test (`test.py`, all six formats): every format answered in about 2 seconds this time, against about 77 seconds in The Ring's earlier saved run, so the delay is intermittent. Attached the Ring API (`https://ring.arc-homlab.com/v1`, model `ring-fast`, key from `RING_CLOUD_KEY`) as an automatic fallback: `server/ai.mjs` (replacing `server/claude.mjs`) tries Claude-Dev first and switches to the Ring API when Claude-Dev takes longer than 25 seconds (`CLAUDE_DEV_TIMEOUT_MS`), errors, or keeps giving unusable answers. The Ring API also works alone if only its key is set. Answers from either are validated the same way, and the Analyst screen says which one answered. The containers pass `RING_CLOUD_KEY` through. Turned on Docker Desktop's start-at-sign-in on this PC (backup at `settings-store.json.bak-barq`).

**Validation:** 25 backend tests and 24 Playwright tests passed (browser suite twice), including a slow-Claude-Dev case served by the Ring API. Tests now clear real AI keys from their environment; before that fix, one backend run sent a few test prompts to the real Ring API. Live check with the real keys: Claude-Dev answered in 2.8 s; with Claude-Dev forced to time out, the Ring API answered in 9.7 s.

**Open items:** The ring server still has neither `CLAUDE_DEV_KEY` nor `RING_CLOUD_KEY` in `~/barq/.env`, and still needs a Cloudflare tunnel route to be public.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-28 21:09 (Asia/Riyadh)

**Update:** At the repository owner's request, copied `CLAUDE_DEV_KEY` and `RING_CLOUD_KEY` to `~/barq/.env` on the ring server (owner-only permissions, written over SSH stdin, values not printed or committed) and recreated the `barq` container so the AI Analyst and its Ring API fallback work there.

**Validation:** `/api/health` on the server reports both Claude-Dev and the Ring API configured, with restart policy `always`. A live read-only advice request on the server returned Claude's tips in 2.9 s.

**Open items:** The ring copy still needs a Cloudflare tunnel route to be public.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-28 21:05 (Asia/Riyadh)

**Update:** Correction to the previous entry: its timestamp should read 2026-10-28 21:04, not 21:09.

**Validation:** Not applicable (log correction).

**Open items:** None.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-28 22:49 (Asia/Riyadh)

**Update:** Moved groups and hangouts out of the AI Analyst into their own **Hangouts** page (`/hangouts`, linked from Home, More and the Analyst); the Analyst keeps Insights and Daily plan. Users now only see the assistant as "Barq": screen text, tips and error messages no longer name Claude or the engines. Every AI request now carries `language: "English"` in its JSON payload and the reply's JSON schema as structured output (the Ring API enforces it with `response_format: json_schema`; Claude-Dev is sent `output_config`); replies with Chinese, Japanese, Korean, Cyrillic or Thai text are rejected and retried. Fixed the hangout game error ("already has a score"): the play screen gave every phone the same first player's turn, so when volunteers opened it on their own phones the second submission failed and replaced the game with an error. Now each phone offers only its own player's turn (the host can still hand one phone around), players can only submit their own score, the board refreshes every 3 seconds while others play, and a turn that was already played refreshes the board instead of erroring. "Back to Hangouts" returns to the new page. Added the Barq OK-sign character (cut from the supplied mockup) to every payment confirmation: Pay at places, Market order, transfer, and hangout bill. Replaced the piggy pose with thumbs and deleted `piggy.png`.

**Validation:** TypeScript build passed. 26 backend tests passed (new: English rejection and retry, own-turn rule; the stand-in AI server now rejects requests without a schema or the English field). 25 Playwright tests passed twice, including the new Hangouts page, the per-phone game flow and the payment character. Live checks with the real keys: a tip and a full daily plan returned valid English JSON from Claude-Dev (3.0 s and 6.4 s) and from the Ring API with Claude-Dev forced to time out (5.0 s and 26.4 s). Checked the public site and a local build in the browser with no console errors.

**Open items:** None.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-28 23:05 (Asia/Riyadh)

**Update:** Merged the `origin/Meshal` commit from Codex (19:05, LAN HTTP `randomUUID` fix) into the local branch; its code targeted the removed `DemoProvider.tsx`, and the current client no longer uses `randomUUID`, so its regression test was ported to the current top-up flow. Added Hangouts history: when everyone who owed has paid, a hangout ends (`endedAt`) and moves from the Active tab to a History tab next to it on the Hangouts page; the payment confirmation stays visible while the card moves. At the repository owner's request, reset all account progress on both machines (balances, transactions, budgets, payments, hangouts and game sessions back to zero) after taking backups (`~/barq/backups/data-20261028-200428.tgz` on the Ring server, `data/backups/` on this PC, git-ignored). Wrote the project report, `docs/PROJECT-REPORT.md`.

**Validation:** 26 backend tests and 26 Playwright tests passed (browser suite twice). After the reset, both servers report 5 users with zero balance and no transactions, payments or hangouts, and only the BarQ Developers group. The new version is running in both containers.

**Open items:** The other team branches (`Almalki`, `Rasel`, `Sultana`, `Testing`) have not been merged or synced with this log.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-29 00:25 (Asia/Riyadh)

**Update:** Added **Occasions** (`/occasions`, from Home and More): budgets for Eid al-Fitr, Eid al-Adha, graduations, home parties and holiday trips. Each starts with suggested budget lines as shares of the budget, and the Eids start on their expected date (editable, since Eid dates follow the moon). Lines can be edited, added, removed and ticked off when bought; the two Eids also have an **Eidia** list (name, amount, given). Each occasion shows budget, planned, left or over, and how much to put aside each week until the date, and Barq can split the budget left after Eidia (its amounts are scaled to always fit). Added the **Saving box** (`/savings`, from the strip under the Home balance, a Home card and More): one goal, the amount to have saved by 31 December, with progress and how much to save per week and per day; money moves between the wallet and the box as "savings" transactions that never count as spending. The old "Your total savings" sheet was replaced by the Saving box. Removed the phone status bar (time, location arrow, 5G and battery) from every screen and moved the content up. New API routes are listed in the README; occasions and the goal are stored on each user in the Users database (older databases work without a migration).

**Validation:** TypeScript build and production build passed. 30 backend tests passed (new: occasions and Eidia, occasion validation, Barq's split scaled to the budget, Saving box goal and moves). 29 Playwright tests passed twice (new: no status bar on any screen, an Eid al-Fitr budget with Eidia and Barq's split, the Saving box goal and moves). Checked Home, More, Occasions, an occasion page and the Saving box in Chrome against a scratch database.

**Open items:** None.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-29 00:29 (Asia/Riyadh)

**Update:** Added an assignment-aligned AI Feature Innovation report in Markdown, editable Word, PDF and self-contained HTML. Applied BarQ yellow/black styling, original character poses and faint logo backgrounds; included the five confirmed team names, current/proposed journeys, wireframes and six prototype screenshots. The report explicitly identifies its source commit, mock account data and local AI test responses. Added report asset/layout scripts.

**Validation:** Verified report sections, source text, names, figures, embedded assets and the Word watermark; visually inspected representative PDF pages. In an isolated copy of the report’s pinned commit, exercised wallet persistence, spending insights, daily planning, Hangouts planning, UI-created voting and filtering 208 places to 50 cafés. No page errors in the completed capture flow. Full suites and live AI were not rerun for this report.

**Open items:** External-source verification and primary user research remain pending as documented. The report reflects its stated earlier snapshot; newer branch features remain intact. The earlier development reload was traced to the temporary database location and resolved by moving it outside watched source files.

Tool: Codex — Developer: Unassigned (report and publication requested by repository owner)

## 2026-10-29 00:56 (Asia/Riyadh)

**Update:** UI polish pass across the whole app; no backend changes. Home: the four feature cards (AI Analyst, Hangouts, Occasions, Saving box) are now a 2 × 2 "Explore with Barq" grid, and the action buttons have rounded focus rings. Transactions: each purchase shows its category icon (food, cafe, groceries, shopping, health, transport, entertainment), with distinct icons for transfers, top-ups, cashback and the Saving box; names and amounts are larger and long names wrap to two lines. Pay at places: payment dates show as "29 Oct" instead of wrapping, and the intro no longer touches the filters. Market: spacing between search and Pay at places, and a shorter subtitle. Cards: "National Day 96 Card" no longer has an indented second line. Analyst and statistics: spending bars use the full width, and Barq's tips have bullets. Hangouts: space between the rules text and the vote cards. Saving box: clearer input placeholders. Places: search placeholder. Empty cart: the "Browse Market" button text was grey and is now readable. New "Page not found" screen with Barq. Small phones (375 px and narrower): tighter page padding, and occasion lines, the add-line row and the payments table no longer get cut off at 320 px. Added a browser-tab icon (the barq mark), which also removes the only console error (missing favicon).

**Validation:** TypeScript and production build passed. 30 backend tests passed. 29 Playwright tests passed twice. Captured every screen and sheet before and after at 402 px with sample data, plus 320 px and 360 px checks with no horizontal overflow.

**Open items:** None.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-29 16:32 (Asia/Riyadh)

**Update:** Added an Arabic language toggle for the whole app (sign-in screen, Products header and account sheet; remembered per device). Every screen, sheet, button, error and accessibility label has Arabic in a warm, everyday Saudi voice (the dialect is never named in the app). The layout turns right to left, with the IBM Plex Sans Arabic font, mirrored arrows and sliders. Every amount, date, time, count and percentage uses Arabic-Indic digits with Arabic separators; number fields show Arabic digits and accept Arabic or Western digits. Text the server stores or sends in English (transaction titles, categories, occasion types and starting lines, hangout results, spending alerts, server and connection errors) is shown in Arabic; names of people and places keep their own direction inside Arabic sentences. The AI payload no longer forces English: the app sends `x-barq-language`, the AI data carries `language: "English"` or `"Arabic"`, Barq's instructions name that language, and Arabic replies must be mostly Arabic (rejected and retried otherwise; Arabic-Indic times are accepted). Occasions are sent to the AI with their Arabic name as well. The English cart label now reads "1 item".

**Validation:** TypeScript and production build passed. 32 backend tests passed (new: the AI writes in the requested language, an English reply to an Arabic request is retried, the Arabic reply check) plus 4 dictionary checks (every text has Arabic, plural forms, placeholders kept, no English in the Arabic). 33 Playwright tests passed (new: the toggle with right-to-left layout, Arabic digits, a translated server error and reload; Barq's Arabic answers; Occasions, Eidia and the Saving box in Arabic; a scan of every Arabic screen and sheet for leftover English). Reviewed every screen and sheet in Arabic and English in Chrome against a scratch database.

**Open items:** None.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-29 17:10 (Asia/Riyadh)

**Update:** Connected all five Points Challenges games to the "who pays" game. The Games database now holds Flappy Bird, Building Challenge, Reaction, Precision Challenge and Number Order (older databases get the four newer games added on start). A session is three games: Flappy Bird first, then two of the other four at random. Each volunteer plays their three games in order on their own phone without waiting for the others (the host can still hand one phone around); every game now sends its final points to the app when it ends (`reportScore` in `public/games/points-games.html`), and a score is saved only for the game that player is on (`gameId`), so a score from another game or a game already played is refused. Points add up as each game counts them and the highest total pays (a tie goes to the best single game). The play screen shows the three games in order, each player's progress and total, and the next game to play. Added **Create a group** (Arabic: «أضف شلة جديدة») on the Hangouts page (`POST /api/groups`: a name and registered friends; the creator is always a member; up to 20 people and 20 groups; no duplicate names), and in Arabic groups are now called «شلة». Occasions now have a saving plan: what is not bought or given yet, spread over the days left, as an amount per day and per month (shown on every occasion and in Barq's message); Barq's structured output for an occasion plan now includes `saving` (perDay, perMonth, tip), and the numbers always come from the server's own calculation. In Arabic, lists of names (for example "Meshal ضد Sultana") now read right to left with each name kept in its own direction.

**Validation:** TypeScript and production build passed. 36 backend tests passed (new: the five games, three-game sessions with Flappy Bird first and varying second and third games, playing in order without waiting, wrong-game and repeated scores refused, highest total pays, creating groups and its validation, the saving plan per day/week/month including the day itself and past occasions, Barq's saving output corrected to the server's numbers, older databases gaining the four games) plus 4 dictionary checks. 35 Playwright tests passed (new: a three-game hangout played through the real games page, Create a group in English and Arabic, the saving plan on the occasion page and in Barq's answer). Played Building, Reaction, Precision, Number Order and Flappy Bird for real in report mode: each sent exactly the points it showed, once, and nothing is sent outside a hangout game. Reviewed the new screens in English and Arabic.

**Open items:** Points are added as each game counts them, so Reaction and Precision (up to 500) weigh more in a total than Number Order (up to 150).

Tool: Claude Code — Developer: Mister M (`Meshal` branch)

## 2026-10-29 17:53 (Asia/Riyadh)

**Update:** Fixed occasion plans failing (always in Arabic). Cause, found with the real AI: an occasion plan is a long answer; Claude-Dev needs about a minute for it in Arabic but was given 25 seconds, and the Ring API fallback mostly fails on it (HTTP 503 with an empty body after about a minute, 3 of 4 tries). Claude-Dev also sometimes returns a long Arabic reply with its start cut off, and it repeats its earlier reply for an identical prompt, so one broken answer kept coming back for the same occasion. Fixes in `server/ai.mjs` and `server/occasions.mjs`: occasion plans wait up to 105 seconds for Claude-Dev, and all their AI calls together stay within 165 seconds (under the app's 3-minute wait); every AI prompt carries a request id, so each request and retry gets a fresh answer; the answer asked for is shorter; retries are logged; and when Barq still can't answer, the standard split for the occasion type comes back with the saving plan, clearly marked in the app ("standard split"), instead of an error. Added the hangout vote timer: when someone asks the group who's paying, the group has 2 minutes to vote (a live countdown on the card); if the vote is still open when time runs out, the hangout is canceled and moves to History as canceled. Hangouts started before this change keep their open vote.

**Validation:** Reproduced the failure live and confirmed the fix with the real AI: the previously stuck Arabic occasion now gets a complete Arabic plan on the first try (67 seconds), English in 68 seconds. 40 backend tests passed (new: the standard split when Barq can't answer, in Arabic and English; the 2-minute timer cancels a vote, refuses late votes, works without anyone opening the list, and leaves older hangouts alone) plus 4 dictionary checks. 37 Playwright tests passed (new: the Arabic occasion plan with the standard split end to end; the vote countdown and a timed-out hangout moving to History as canceled).

**Open items:** None.

Tool: Claude Code — Developer: Mister M (`Meshal` branch)
