# barq — unofficial interactive UI prototype

An independent, frontend-only reconstruction of the five original user-supplied barq screenshots and two follow-up lower-screen references, prepared for a product proposal. **This is not an official barq application and is not affiliated with or endorsed by barq.** All displayed account information, balances, card identifiers, transactions, purchases, requests and transfers are fictional. No authentication, backend, bank connection or payment processing is included.

## Run locally

Requirements: Node.js 22 or newer and npm. Developed and checked with Node.js 24.18 on Windows.

From this folder:

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite, normally http://127.0.0.1:5173/. The development server binds only to loopback. The app uses a full mobile viewport on small screens and a centered 402 px phone preview on desktop. The reference comparison viewport is **402 × 874 CSS pixels**, normalized from the supplied images.

```sh
npm run build       # Strict TypeScript check, then production build in dist/
npm run preview     # Serve the production build locally
npm run test:e2e    # Browser interaction and responsive checks
```

The browser tests use an installed Google Chrome. Playwright starts a local development server if one is not already running. Test output goes to `test-results/`; visual QA captures default to `test-results/visual/`. Set `BARQ_CAPTURE_DIR` to redirect captures elsewhere. If Chrome is unavailable, install Playwright Chromium with `npx playwright install chromium` and change `use.channel` in `playwright.config.ts` to `chromium`.

## Included screens and interactions

| Screen | Working interactions |
| --- | --- |
| Home | Profile/account sheet, account selector, notifications, statistics, balance visibility, validated demo top-up, transaction filtering and receipts, savings goal, transfers, supplied marathon banner and demo ranking |
| Rewards | Help sheet, one deterministic demo wheel spin, quest exploration, simulated marathon entry |
| Cards | Three fictional cards, freeze/unfreeze, non-sensitive demo details, spending-limit slider, card selection sheet |
| Market | Six category routes, product search, favorites, product details, quantity controls, cart and validated simulated checkout |
| More / Products | Fictional wallet/local/international transfers, simulated money requests, Baloot lobby, Points Challenges (four Arabic mini-games with the pixel mascot, served from `public/games/` at `/points-games`), Youth Accounts, Domestic Labor Salaries demo, Offers, support topics, sticky Products header and vertical scrolling |

The five-tab navigation stays visible across the app. Detail routes have back controls; dialogs support Escape, keyboard focus containment, and browser Back. Reduced-motion preferences and iOS bottom safe-area insets are respected.

## Try the demonstration

1. On Home, use **Add money**, choose SAR 100, review and confirm. The balance increases from SAR 1,284.50 to SAR 1,384.50 and a transaction appears.
2. Open **Cards → National Day 96 Card → Freeze card**. Return to the card to see the retained state.
3. Search for **Xbox** in Market, save the product, add it to the cart, and complete the demo order. The mock wallet and activity update together.
4. Open **Rewards → Spin the Wheel**. The one available spin always awards SAR 5 of fictional cashback.
5. Use **Account → Reset demo data** to restart the demonstration.

State is deliberately in memory. Refreshing the page resets it. The card spending-limit slider is local to its detail view. Money requests do not contact anyone; the support flow returns canned responses; Baloot stops at a simulated lobby. Checkout never creates a real order or delivers a real product. Do not enter real personal or financial information.

## Architecture

```text
src/
  app/                     Router shell and shared mock-state reducer
  components/
    ui/                    Buttons, page headers, artwork, traced brand mark
    navigation/            Fixed five-tab bottom navigation
    cards/                 Reusable service tiles
    modals/                Native dialog, focus handling, demo forms
  screens/
    Home/ Rewards/ Cards/ Market/ More/
    Detail/                Reward, card, transaction and market detail routes
  features/proposed/       Reserved extension point; no AI features implemented
  data/mock/               Typed fictional accounts, transactions and products
  hooks/                   URL-backed modal navigation
  styles/                  Screenshot-derived design tokens and component CSS
  assets/                  Local reference artwork and generated desert background
  types/                   Shared TypeScript models
tests/                     Playwright browser checks
docs/                      Visual checklist, asset provenance and comparison images
```

React + TypeScript, Vite, Tailwind CSS, Lucide React, Motion, and React Router are used. Custom styling follows the references rather than a generic component theme. Tailwind is integrated through its [official Vite plugin](https://tailwindcss.com/docs/installation/using-vite); navigation uses [React Router's declarative mode](https://reactrouter.com/start/declarative/installation). Dependencies are locked in `package-lock.json`.

Each proposed feature should later live in its own module under `src/features/proposed/` and be added only after explicit approval. Keep baseline screen styling intact and use mock data. No AI feature, model call, or AI placeholder is enabled in the app.

## Visual fidelity and assets

The screen layouts, labels, controls, surfaces and navigation are real React components. Isolated illustration and card-art regions are presented through SVG viewports over the supplied reference artwork. Whole screenshots are **not** used as screen backgrounds. The barq mark is a vector trace of the supplied Products screenshot, reused for profile, service and Rewards navigation icons.

The desert is a generated replacement photograph. Inter is the bundled typeface substitute because the original app font files were not supplied. The lower Home marathon promotion now displays the supplied campaign artwork. Its seven reference indicators are visual only: just the one supplied campaign is implemented. See [visual comparison checklist](docs/VISUAL-COMPARISON.md) and [asset provenance](docs/ASSETS.md) for the remaining differences. Do not describe this as pixel-identical or as an official app.

## Verification

- Production build and strict TypeScript validation completed successfully.
- Eleven Playwright checks passed: five baseline screen renders, navigation and scroll, balance/top-up/history, card freezing, market/favorites/checkout, rewards, transfer validation, dialog keyboard/back behavior, desktop/narrow responsiveness, lower Products tiles with salary balance validation, and the supplied Home campaign/ranking flow.
- Five baseline screens were captured at 402 × 874 and reviewed side-by-side with the supplied references. Follow-up render checks verified the corrected brand mark and both lower-screen references.
- Desktop centering was checked at 1280 × 1000; horizontal overflow was checked at widths 320, 375 and 430.
- Browser verification used Chrome on Windows. Physical iPhone/Safari testing has not been performed.

For static hosting in a later, explicitly requested deployment, configure SPA fallback to `index.html` so direct nested routes resolve. This deliverable is local-only and has not been published.
