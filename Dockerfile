# ── Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

# Empty VITE_API_URL = relative URLs → server.js proxies /api to gateway internally
ENV VITE_API_URL=""
# Build client bundle (dist/client) + SSR bundle (dist/ssr)
RUN npm run build:all

# ── Serve ───────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Only copy production dependencies
COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js

ENV PORT=5173
ENV NODE_ENV=production

EXPOSE 5173

CMD ["node", "server.js"]
