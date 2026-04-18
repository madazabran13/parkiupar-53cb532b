# ── Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

# Empty VITE_API_URL = relative URLs → nginx proxies /api to gateway internally
ENV VITE_API_URL=""
RUN npm run build

# ── Serve ───────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
