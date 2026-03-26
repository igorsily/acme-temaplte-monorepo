# syntax=docker/dockerfile:1.7
# Build context: monorepo root
# Usage: docker build -f apps/web/Dockerfile -t omnia-web .

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS deps

WORKDIR /app

# Copy workspace manifests first — changes rarely, maximizes cache hits
COPY package.json bun.lock                ./
COPY apps/web/package.json                ./apps/web/
COPY packages/api/package.json            ./packages/api/
COPY packages/auth/package.json           ./packages/auth/
COPY packages/config/package.json         ./packages/config/
COPY packages/core/package.json           ./packages/core/
COPY packages/env/package.json            ./packages/env/
COPY packages/types/package.json          ./packages/types/

RUN bun install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM deps AS builder

# Copy source files after deps to preserve cache on dependency-only changes
COPY tsconfig.json                        ./
COPY apps/web/                            ./apps/web/
COPY packages/api/                        ./packages/api/
COPY packages/auth/                       ./packages/auth/
COPY packages/config/                     ./packages/config/
COPY packages/core/                       ./packages/core/
COPY packages/env/                        ./packages/env/
COPY packages/types/                      ./packages/types/

# Vite bundles all workspace packages — output is self-contained static files
RUN cd apps/web && bun run build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY apps/web/nginx.conf          /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
