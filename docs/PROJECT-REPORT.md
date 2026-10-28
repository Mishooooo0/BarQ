# BarQ — Project Report

**Date:** 28 October 2026 · **Branch:** `Meshal` (merged into `main`) · **Live:** https://barq1.arc-homlab.com

## 1. Summary

BarQ is a mobile banking app prototype built in one day by the team on top of a reconstructed barq interface. It has a working JavaScript backend with four databases, sign-in for five team accounts, a wallet whose every change is stored on the server, an AI Analyst called **Barq**, group hangouts with a "who's paying?" vote and a Flappy Bird game to decide the payer, and a Market section to pay at 208 real Riyadh places. It runs 24/7 in Docker on a team PC and on the Ring server, where it is published at barq1.arc-homlab.com.

All accounts currently start from zero: no balances, no transactions, no budgets, no payments and no hangouts. The only records are the five logins, the BarQ Developers group, the Flappy Bird game entry and the Places data.

| Area | Status |
| --- | --- |
| Backend (4 databases, JSON API) | Done |
| Sign-in (name + 4-digit PIN) | Done |
| Wallet: top-up, transfers, Market checkout, Pay at places | Done, stored on the server |
| AI Analyst (insights, tips, daily plan) | Done, two AI engines with automatic fallback |
| Hangouts (groups, AI plan, who-pays vote, game, history) | Done |
| Deployment (local + Ring, 24/7) | Done, public URL live |
| Tests | 26 backend + 26 browser tests, all passing |

## 2. Timeline

| Time (Riyadh) | Milestone | By |
| --- | --- | --- |
| 00:30 – 01:13 | Repository created; interface prototype added | Mister M, Abdullah |
| 15:05 | Shared `Updates.md`, `Plan.md`, `Part.md` added on `main` | Mister M |
| 18:06 – 19:00 | Points Challenges games added, then the flying camel game (Alsehli) | Abdullah |
| 18:37 – 18:56 | Places data (Almalki) merged; read-only places API; single-process server | Codex |
| 19:02 | Alsehli's new UI merged into `Meshal` | Claude Code |
| 19:05 | Fix for a white-screen crash on LAN HTTP addresses | Codex |
| 19:29 | Backend per `Plan.md`, sign-in, 5 accounts, AI Analyst, "Demo" naming removed, UI hardened against backend failures | Claude Code |
| 20:36 | Claude connected; Payments database and Pay at places; BarQ Developers group; who-pays votes; all mock data removed | Claude Code |
| 20:37 – 20:44 | Docker image; deployment to the Ring server; 24/7 with host-folder data | Claude Code |
| 21:02 – 21:05 | Ring API attached as the AI fallback; AI keys added on the server | Claude Code |
| 22:49 | Hangouts page; Barq naming; English structured output; game turn fix; payment character | Claude Code |
| 23:03 | Hangouts history; account progress reset on both machines | Claude Code |
| 29 Oct, 00:25 | Occasions (Eid al-Fitr, Eid al-Adha, graduation, home party, holiday trip) with Eidia lists; Saving box with an end-of-year goal; phone status bar removed | Claude Code |

## 3. Architecture

```text
Browser (React, phone-sized UI)
   │  /api/*  (JSON, Bearer token)
   ▼
Node server (server/api.mjs) ──► AI: Claude-Dev  ──(slow/failing)──► Ring API
   │
   ├── Users DB      data/db/users.json     accounts, wallets, transactions, groups
   ├── Games DB      data/db/games.json     games, game sessions, hangouts + votes
   ├── Payments DB   data/db/payments.json  every payment: name, price, category, date
   └── Places DB     data/categories.json + data/riyadh_all_seven_categories_v2.jsonl (read-only)
```

- **Frontend:** React 19, TypeScript, Vite, React Router, Motion, Tailwind, Lucide icons.
- **Backend:** Node's standard library plus the official Anthropic SDK. One process serves both the UI and the API, in development (inside Vite, with live reload of backend files) and in production (`server/start.mjs`).
- **Storage:** JSON files with atomic writes. Every read comes from disk, so several processes can share one data folder safely.

## 4. Databases

| Database | Contents |
| --- | --- |
| **Users** | Abdullah M, Abdullah S, Meshal, Sultana, Rasel. Name, PIN hash (scrypt), balance, Saving box amount and end-of-year goal, cashback, hangout budget, occasions (budget lines and Eidia list), transactions (seller, category, amount, date). Groups: **BarQ Developers** (all five). |
| **Games** | Flappy Bird (the flying game in Points Challenges). Game sessions (players, rounds, scores, payer). Hangouts with their votes, result, who owes what, and when they ended. |
| **Payments** | One record per payment (Pay at places and hangout bills): name, price, category, date, plus id, user, place and transaction ids. |
| **Places & Categories** | 7 category templates (Food, Cafe, Health, Shopping, Groceries, Transportation, Entertainment) and 208 Riyadh places with ratings and price bands. |

## 5. Features

### Sign-in and wallet
- Choose a name and enter a 4-digit PIN. Sessions are signed tokens that last 7 days and survive restarts; five wrong PINs lock an account for 30 seconds.
- Balance and history come from the server. Top-ups, transfers between team members, Market checkout and Pay at places all change the stored balance.

### AI Analyst ("Barq")
- **Insights:** today, week and 30-day spending, suggested daily/weekly/monthly budgets, how long the balance lasts, overspending alerts, upcoming subscriptions, spending by category. These are computed from real data and load instantly.
- **Tips and plans:** Barq writes the headline and tips, and plans a day from a budget slider limited to the wallet. Plans only use real places, and prices always come from the database.
- **Two engines:** Claude-Dev (Claude Haiku 4.5) answers first. If it takes more than 25 seconds, fails, or keeps giving unusable answers, the Ring API (`ring-fast`) answers instead. Users only ever see the name "Barq".
- **Structured output in English:** each request sends `language: "English"` and the exact JSON shape of the answer. The Ring API enforces the shape; Claude-Dev is sent it too. Every answer is validated on the server, and answers in Chinese, Japanese, Korean, Cyrillic or Thai are rejected and retried.

### Hangouts (own page)
- Groups and members; any member can add a registered user to a group.
- Barq plans an outing around the **smallest** budget in the group, so nobody is put on the spot. Other members' budgets are never shown or sent to the AI.
- **Who's paying? vote:** each member votes Split the bill, Everyone pays their own, or I will pay it.

  | Votes | Result |
  | --- | --- |
  | Exactly one "I will pay it" | That person pays the whole bill |
  | Two or more "I will pay it" | They play Flappy Bird, each on their own phone; the highest score pays |
  | Nobody volunteers | Split or own, whichever has more votes |
  | Split ties with own | Everyone pays their own |

- Whoever owes taps Pay; payments are charged to the wallet and saved in Payments.
- **History:** when everyone who owed has paid, the hangout ends and moves from the Active tab to the History tab, with its end date.

### Occasions and Eidia
- Budgets for Eid al-Fitr, Eid al-Adha, graduations, home parties and holiday trips. Each starts with suggested lines as shares of the budget (Eids start on their expected date, which can be changed). Lines can be edited and ticked off when bought.
- The two Eids have an Eidia list: who you give to, how much, and whether it was given.
- Shows budget, planned, left or over, and how much to put aside each week until the date. Barq can split the rest of the budget (after Eidia); its amounts are scaled to always fit.

### Saving box
- Move money from the wallet into the box and back. One goal: the amount to have saved by 31 December. Shows progress and how much to save per week and per day. Moves are "savings" transactions and never count as spending.

### Market → Pay at places
- Buy from any of the 208 places, filter by category or search, change the payment date (today or up to a year back). The record is saved as name, price, category and date.

### Barq character
- The pixel-art analyst appears throughout the app and changes pose with what he says. After every payment (Pay at places, Market order, transfer, hangout bill) he gives an OK sign over the confirmation.

## 6. Deployment and operations

| | This PC | Ring server |
| --- | --- | --- |
| Container | `barq-local` | `barq` |
| Address | http://127.0.0.1:5352 | 127.0.0.1:5352, published at https://barq1.arc-homlab.com |
| Restarts | `restart: always`; Docker Desktop starts at sign-in | `restart: always`; Docker starts at boot |
| Data | `data/db` (host folder) | `~/barq/data` (host folder) |
| AI keys | From the user environment | `~/barq/.env` (owner-only) |
| Update | `docker compose up -d --build` | `bash deploy/deploy.sh` (deploys the committed HEAD) |

Crash recovery was tested on the Ring server: after the process was killed, Docker restarted it automatically and existing sign-ins kept working. Backups of the data taken before the latest reset are in `~/barq/backups/` (Ring) and `data/backups/` (this PC, git-ignored).

## 7. Quality

- **Backend tests (30):** databases, sign-in and lockout, forged tokens, empty starting accounts, wallet operations, transfers, payments with back-dated entries, groups, game sessions, all voting scenarios, occasions and Eidia (including validation and Barq's split), the Saving box, AI validation (retries, invented places rejected, English enforced), the AI fallback, and migration of older databases.
- **Browser tests (29):** every main screen, sign-in, wallet flows, Market, rewards, the Analyst, Hangouts with votes, the game and History, Occasions with Eidia, the Saving box, no phone status bar, a simulated backend outage, a LAN-address crash regression, narrow screens and desktop layout.
- Tests use isolated databases and a local stand-in for both AI engines; they never touch real data or call the real AI.
- The UI does not break when the backend changes or fails: every screen shows a readable error with Try again, and an error boundary protects the rest of the app.

## 8. Security and privacy notes

- PINs are stored as salted scrypt hashes. API keys are read from the environment and never committed; every commit was scanned for keys.
- The public site is a prototype with mock money. Test PINs are in `server/seed.mjs`, so anyone with repository access can sign in to the public deployment.
- Claude-Dev is a third-party proxy, not Anthropic's own API. Spending summaries are sent to it (and to the Ring API on fallback) to produce advice.

## 9. Known limitations and next steps

1. Claude-Dev's response time varies widely (about 2 seconds to over a minute); the Ring API fallback covers the slow periods, at up to about 30 seconds per answer.
2. Only one game (Flappy Bird) is in the Games database, as planned; adding more lets a hangout game have several rounds.
3. Cards, the Market product catalog and rewards progress are still local to the browser.
4. The public deployment uses the test PINs; change them in `server/seed.mjs` and run `npm run db:reset` before wider use.
5. The other team branches (`Almalki`, `Rasel`, `Sultana`, `Testing`) have not been merged into this work.

## 10. How to run

```bash
npm ci
npm run dev                      # UI + API at http://127.0.0.1:5173
npm test                         # backend tests
npm run test:e2e                 # browser tests
docker compose up -d --build     # 24/7 container on this PC
bash deploy/deploy.sh            # deploy to the Ring server
npm run db:reset                 # reset all accounts to zero
```

See [README.md](../README.md) for the API reference and configuration, and [Updates.md](../Updates.md) for the full change log.
