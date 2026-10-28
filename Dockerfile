# BarQ: one Node process serving the built UI and the API (server/start.mjs).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5352
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/data ./data
# data/db holds the live Users, Games and Payments databases; compose mounts a volume here.
RUN mkdir -p /app/data/db && chown -R node:node /app/data/db
USER node
EXPOSE 5352
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:5352/api/health >/dev/null || exit 1
CMD ["node", "server/start.mjs"]
