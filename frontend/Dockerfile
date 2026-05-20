# Frontend Dockerfile
# Two stages: Node builds the static files, nginx serves them.

# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build
# Output is in /app/dist

# ── Stage 2: Serve ─────────────────────────────────────────────────────────
FROM nginx:alpine AS final

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config: serve static files + proxy /api/* to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
