# BarQ

A mobile banking app prototype with a JavaScript backend: five mock accounts, 60 days of spending each, a Places database, a games database for "who pays the bill", and an AI Analyst. The interface is an independent reconstruction of barq screenshots. **This is not an official barq application and is not affiliated with or endorsed by barq.** All accounts, balances and transactions are mock data; no real money moves.

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
| `npm run api` | API only on port 3001 |
| `npm run db:reset` | Recreates the Users and Games databases from the seed |
| `npm test` | Backend tests (Node test runner, temporary database) |
| `npm run test:e2e` | Browser tests (Playwright + Chrome, separate database in `test-results/e2e-db`) |
| `npm run build` | Strict TypeScript check and production build in `dist/` |

## Accounts

Sign in by choosing a name and entering its 4-digit PIN. The five accounts from `Plan.md` are **Abdullah M, Abdullah S, Meshal, Sultana and Rasel**. Their test PINs, starting balances and spending habits are defined in [`server/seed.mjs`](server/seed.mjs) (`SEED_ACCOUNTS`). Change them there and run `npm run db:reset`.

PINs are stored as salted scrypt hashes. A session is a signed token that lasts 7 days and survives server restarts. Five wrong PINs lock an account for 30 seconds.

## Databases

| Database | Where | Contents |
| --- | --- | --- |
| Users | `data/db/users.json` (created on first run, not committed) | 5 users: name, PIN hash, balance, savings, cashback, hangout budget, and 60 days of transactions (seller, category, amount, date). Groups of friends. |
| Games | `data/db/games.json` (created on first run, not committed) | One game for now, **Flappy Bird** (the flying game in Points Challenges), plus game sessions |
| Places & Categories | `data/categories.json`, `data/riyadh_all_seven_categories_v2.jsonl` (committed, read-only) | 7 category templates (Food, Cafe, Health, Shopping, Groceries, Transportation, Entertainment) and 208 Riyadh places |

The spending history is generated deterministically and always ends on the day the database is created. The directory (`GET /api/users`) is open; anything under `/api/me` needs a session.

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
| `GET /api/analyst/insights` · `POST /api/analyst/daily` `{ budget }` · `POST /api/analyst/hangout` `{ budget, groupId }` | AI Analyst |
| `GET /api/games` · `POST /api/game-sessions` · `GET /api/game-sessions/:id` · `POST /api/game-sessions/:id/scores` · `POST /api/game-sessions/:id/settle` | Who-pays-the-bill games |

Send the token as `Authorization: Bearer <token>`. Errors are always JSON: `{ "error": "message" }`.

## AI Analyst

Open it from the card on Home or from More → Explore. The character is the pixel-art analyst from the supplied character sheet (`src/assets/analyst/`), and his pose changes with what he is saying.

- **Insights:** today, week and 30-day spending; suggested daily, weekly and monthly budgets; how long the balance lasts; overspending alerts by category; upcoming subscription renewals; spending by category.
- **Daily plan:** choose a budget with the slider, from SAR 0 up to what is in your wallet. The analyst builds a day (rides, coffee, lunch, outing, dinner) from Riyadh places that fit, weighted by your own habits, and shows what stays in your wallet.
- **Hangout:** choose a group and your budget. The plan uses the **smallest** budget in the group so nobody is put on the spot. Other members' budgets and balances are never shown.

The analyst runs on deterministic rules in [`server/analyst.mjs`](server/analyst.mjs). It works offline and gives the same answer for the same data. It does not call a language model.

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
  analyst.mjs    AI Analyst: insights, daily plan, hangout plan
  games.mjs      Game sessions and bill payer
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

React + TypeScript, Vite, Tailwind CSS, Lucide React, Motion and React Router on the frontend. The backend uses only Node's standard library. Cards, Market products and rewards progress remain local UI state. See [visual comparison checklist](docs/VISUAL-COMPARISON.md) and [asset provenance](docs/ASSETS.md) for the reference artwork. Do not enter real personal or financial information.
