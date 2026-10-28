# Reserved for future proposals

Add each explicitly approved proposal in an isolated subfolder with its own components, types, and tests. Integrate through a route in `src/app/App.tsx`; do not change baseline screen styling by default. Wallet data (balance, transactions, transfers) is available through `useWallet()` and comes from the BarQ API. The AI Analyst lives in `src/screens/Analyst/` and `server/analyst.mjs`. Never add production bank connections or request real credentials for this prototype.
