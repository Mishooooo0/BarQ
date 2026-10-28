# BarQ

A mobile banking app prototype with a JavaScript backend: five accounts that start empty, a Places database, a games database for "who pays the bill", a Payments database, and an AI Analyst powered by Claude. The interface is an independent reconstruction of barq screenshots. **This is not an official barq application and is not affiliated with or endorsed by barq.** All accounts, balances and transactions are mock data; no real money moves.

## Run locally

Requirements: Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/. `npm run dev` runs the UI **and** the API in one process on one origin, so there is nothing else to start. Backend files in `server/` are reloaded on the next request after you save them; no restart is needed, and a broken backend file only makes that request fail with a clear message.

| Command | What it does |
| --- | --- |
| `npm run dev` | UI + API with hot reload (port 5173) |
| `npm start` | Builds, then serves the built UI + API from one Node process on port 5352 (`PORT`, `HOST` override) |
| `docker compose up -d --build` | Runs BarQ 24/7 in the `barq-local` container on port 5352 (restarts automatically, data stays in `data/db`) |
| `npm run api` | API only on port 3001 |
| `npm run db:reset` | Recreates the Users, Games and Payments databases from the seed |
| `npm test` | Backend tests (Node test runner, temporary database) |
| `npm run test:e2e` | Browser tests (Playwright + Chrome, separate database in `test-results/e2e-db`) |
| `npm run build` | Strict TypeScript check and production build in `dist/` |

## Connecting the AI Analyst

The analyst calls Claude through the **Claude-Dev** endpoint (the same one The Ring's `claude-dev` profile uses). The server reads these environment variables; the key is never written to the repo:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CLAUDE_DEV_KEY` | (required) | API key for the endpoint |
| `CLAUDE_DEV_BASE_URL` | `https://claudeapikey.dev` | Endpoint base URL |
| `CLAUDE_DEV_MODEL` | `claude-haiku-4-5` | Model name |
| `CLAUDE_DEV_TIMEOUT_MS` | `25000` | How long to wait for Claude-Dev before using the Ring API |
| `RING_CLOUD_KEY` | (optional) | Key for the Ring API fallback (the same variable The Ring uses) |
| `RING_API_BASE_URL` | `https://ring.arc-homlab.com/v1` | Ring API base URL (OpenAI-compatible) |
| `RING_API_MODEL` | `ring-fast` | Ring API model |

Set the key once in your Windows user environment, then open a new terminal so the server inherits it. `GET /api/health` shows `ai.configured` (never the key). Without a key the facts still load, and the plans and tips explain how to connect.

**Ring API fallback:** Claude-Dev's response time varies a lot (about 2 seconds in one test, about 77 seconds in another). If it takes longer than `CLAUDE_DEV_TIMEOUT_MS`, returns an error, or keeps giving unusable answers, the Ring API answers instead (`ring-fast` answered in about 6 seconds in testing). The screen says which one answered, and `GET /api/health` shows both connections under `ai`.

Users only ever see the assistant as **Barq**: the screens say "Answered by Barq AI" (or "Barq AI (backup engine…)" when the Ring API answered), and error messages never name the engines.

**Structured output in English:** every request carries `language: "English"` in its JSON payload plus the JSON schema of the reply. The Ring API enforces the schema (`response_format: json_schema`); Claude-Dev is sent the same schema (`output_config`). Any reply containing Chinese, Japanese, Korean, Cyrillic or Thai text is rejected and retried (Arabic is allowed because place names use it).

Claude-Dev ignores the API's structured-output option and replaces client tools with its own, so the server asks for JSON in the prompt and validates every answer. Place ids must exist in the Places database, prices come from the database rather than from Claude, totals are kept within the budget, and an unusable answer is retried once. Calls are queued one at a time because the account allows one request at a time.

## Running 24/7

BarQ runs in Docker with `restart: always`, so it comes back after a crash or restart without anyone starting it.

- **This PC:** `docker compose up -d --build` from the repo root starts the `barq-local` container on http://127.0.0.1:5352. The databases stay in `data/db`. It runs whenever Docker Desktop is running; turn on *Settings → General → Start Docker Desktop when you sign in* so it also starts after Windows restarts.
- **Ring server:** `bash deploy/deploy.sh` deploys the committed HEAD to `~/barq` as the `barq` container (127.0.0.1:5352). Docker starts at boot, and the databases live in `~/barq/data` on the host, so redeploys and rebuilds never touch them. To back them up: `ssh ring 'sudo tar -czf - -C ~/barq data' > barq-data.tgz`.

## Accounts

Sign in by choosing a name and entering its 4-digit PIN. The five accounts from `Plan.md` are **Abdullah M, Abdullah S, Meshal, Sultana and Rasel**. Their test PINs are defined in [`server/seed.mjs`](server/seed.mjs) (`SEED_ACCOUNTS`). Change them there and run `npm run db:reset`.

There is no mock data: every account starts with a zero balance, zero savings and cashback, no transactions and no budgets. Add money from Home to start; everything after that is real activity stored in the databases.

PINs are stored as salted scrypt hashes. A session is a signed token that lasts 7 days and survives server restarts. Five wrong PINs lock an account for 30 seconds.

## Databases

| Database | Where | Contents |
| --- | --- | --- |
| Users | `data/db/users.json` (created on first run, not committed) | 5 users: name, PIN hash, balance, savings, cashback, hangout budget and transactions (seller, category, amount, date), all starting empty. Groups of friends. |
| Games | `data/db/games.json` (created on first run, not committed) | One game for now, **Flappy Bird** (the flying game in Points Challenges), game sessions, and hangouts with their "who pays?" votes |
| Payments | `data/db/payments.json` (created on first run, not committed) | Purchases made from Market → Pay at places, stored as **name, price, category, date** (plus id, user, place id and the wallet transaction id) |
| Places & Categories | `data/categories.json`, `data/riyadh_all_seven_categories_v2.jsonl` (committed, read-only) | 7 category templates (Food, Cafe, Health, Shopping, Groceries, Transportation, Entertainment) and 208 Riyadh places |

All five users are in the **BarQ Developers** group. Older databases get the group and the Payments file added automatically on start.

The directory (`GET /api/users`) is open; anything under `/api/me` needs a session.

## API

| Method & path | Purpose |
| --- | --- |
| `GET /api/health` | Status and record counts |
| `GET /api/categories` | The 7 category templates with place counts |
| `GET /api/places?category=&q=&maxCost=&limit=&offset=` · `GET /api/places/:id` | Search Riyadh places |
| `GET /api/users` | Directory of accounts (id and name only) |
| `POST /api/auth/login` `{ userId or name, pin }` | Returns `{ token, user }` |
| `GET /api/me` · `GET /api/me/transactions` · `GET /api/me/spending?period=day\|week\|month\|year` | Account, history and spending totals |
| `POST /api/me/transactions` `{ kind: topup\|purchase\|cashback, amount, seller, category }` | Changes the stored balance |
| `POST /api/transfers` `{ to, amount, channel }` | Moves money between two accounts |
| `PUT /api/me/budget` `{ amount }` · `GET /api/me/groups` | Hangout budget and friend groups |
| `POST /api/groups/:id/members` `{ userId }` | Add a registered user to a group (members only) |
| `GET /api/analyst/insights` | Spending facts computed from your history (instant) |
| `GET /api/analyst/advice` · `POST /api/analyst/daily` `{ budget }` · `POST /api/analyst/hangout` `{ budget, groupId }` | Claude's headline and tips, daily plan, hangout plan |
| `GET /api/hangouts?groupId=` · `POST /api/hangouts` `{ groupId, items }` | Group hangouts and their votes; start a vote from a planned hangout |
| `POST /api/hangouts/:id/vote` `{ choice: split\|own\|pay }` · `POST /api/hangouts/:id/close` · `POST /api/hangouts/:id/pay` | Vote, end the vote early (starter only), pay your part |
| `GET /api/payments` · `POST /api/payments` `{ placeId, date }` | Your payments; pay at a place on a date (`YYYY-MM-DD`, today or up to a year back) |
| `GET /api/games` · `POST /api/game-sessions` · `GET /api/game-sessions/:id` · `POST /api/game-sessions/:id/scores` · `POST /api/game-sessions/:id/settle` | Who-pays-the-bill games |

Send the token as `Authorization: Bearer <token>`. Errors are always JSON: `{ "error": "message" }`.

## AI Analyst

Open it from the card on Home or from More → Explore. The character is the pixel-art analyst from the supplied character sheet (`src/assets/analyst/`), and his pose changes with what he is saying. After every payment (Pay at places, Market order, transfer, hangout bill) Barq appears giving an OK sign.

- **Insights:** today, week and 30-day spending; suggested daily, weekly and monthly budgets; how long the balance lasts; overspending alerts by category; upcoming subscription renewals; spending by category. These are computed from your data and load instantly. Claude then writes the headline and tips.
- **Daily plan:** choose a budget with the slider, from SAR 0 up to what is in your wallet. Claude builds the day from Riyadh places that fit, weighted by your own habits, and shows what stays in your wallet.
- **Hangouts** (its own page, from Home, More or the Analyst): choose a group and your budget, and add people to the group. The plan uses the **smallest** budget in the group so nobody is put on the spot. Only that smallest budget is sent to Claude; other members' budgets and balances are never shown or sent.

Facts and candidate places are computed in [`server/analyst.mjs`](server/analyst.mjs); the AI clients (Claude-Dev, then the Ring API) are in [`server/ai.mjs`](server/ai.mjs). Tests use a local stand-in for both (`tests/fake-claude.mjs`) and never call the real endpoints.

## Who's paying? (hangout votes)

After the analyst plans a hangout on the **Hangouts** page, tap **Ask the group: who's paying?**. Every member of the group votes from their own phone (Hangouts page) for one of three choices: **Split the bill**, **Everyone pays their own**, or **I will pay it**. Votes stay hidden until the vote ends, which happens when everyone has voted or when the person who started it ends it early.

| Votes | Result |
| --- | --- |
| Exactly one "I will pay it" (e.g. 3 split, 1 I will pay) | That person pays the whole bill |
| Two or more "I will pay it" | Those people play Flappy Bird, each on their own phone (or the host hands one phone around); the highest score pays |
| Nobody volunteers | Split or own, whichever has more votes |
| Nobody volunteers and split ties with own | Everyone pays their own |

When everyone who owed has paid, the hangout ends and moves from the **Active** tab to the **History** tab, with its end date.

The bill is the plan's per-person cost times the group size, priced from the Places database. Whoever owes taps **Pay**: the payer pays the whole bill, or each member pays their share. Each payment is charged to the wallet and saved in the Payments database. The rules are in [`server/hangouts.mjs`](server/hangouts.mjs).

## Market → Pay at places

Open **Market → Pay at places** to buy from any of the 208 places in the Categories database. Filter by the 7 categories or search, pick a place, change the payment date if you need to (today or up to a year back), and pay. The price is the place's estimated cost per person. The wallet is charged, the transaction appears in your history on that date, and the record is saved in the Payments database as name, price, category and date. Your payments are listed on the same screen.

## Game system

`POST /api/game-sessions` with 2 to 5 players and an optional bill. Every active game is played once in random order (one game for now). The host enters each player's points; when every player has scored in every game, the player with the most points pays. A tie goes to the best single round, then to the earlier player in the list. `settle` charges the payer's wallet. The games UI (Points Challenges) is not connected to sessions yet.

## Architecture

```text
server/
  api.mjs        JSON API router used by both the dev server and the production server
  index.mjs      Production HTTP server: API + built UI, app shell for client routes
  db.mjs         File-backed JSON databases with atomic writes
  seed.mjs       The five accounts, groups, games and 60-day spending generator
  auth.mjs       PIN hashing, signed session tokens, lockout
  analyst.mjs    AI Analyst: facts, candidate places, validation of Claude's plans
  ai.mjs         AI clients: Claude-Dev first, Ring API fallback; JSON prompting, retries, one request at a time
  games.mjs      Game sessions and bill payer
  hangouts.mjs   "Who pays?" vote rules and who owes what
  places.mjs     Places and Categories database
src/
  app/           Router shell, SessionProvider (sign-in), WalletProvider (balance and history from the API)
  lib/api.ts     Fetch wrapper: timeouts, readable errors, session expiry
  screens/       Home, Rewards, Cards, Market, More, Places, Analyst, Login, Games, details
  components/    UI primitives, bottom navigation, sheets, error boundary
tests/           Playwright browser checks
```

### Why the UI no longer breaks when the backend changes

- The API runs inside the Vite dev server, so there is no second process or proxy that can be down.
- Backend modules reload on change, and a failing module returns a JSON 500 for that request only.
- Every API call goes through `src/lib/api.ts`, which turns network errors, timeouts, non-JSON and server errors into readable messages. Screens show an error with **Try again** instead of throwing.
- An error boundary around the routes keeps one broken screen from blanking the app.
- An expired or invalid session returns to sign-in instead of failing silently. A server that is down keeps the session and offers retry.
- `npm start` rebuilds the UI before serving, so the server never serves a stale or missing build.

## Notes

React + TypeScript, Vite, Tailwind CSS, Lucide React, Motion and React Router on the frontend. The backend uses only Node's standard library. Cards, Market products and rewards progress remain local UI state. The full project report is in [docs/PROJECT-REPORT.md](docs/PROJECT-REPORT.md). See [visual comparison checklist](docs/VISUAL-COMPARISON.md) and [asset provenance](docs/ASSETS.md) for the reference artwork. Do not enter real personal or financial information.
