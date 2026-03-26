# syntax=docker/dockerfile:1.7
# Build context: monorepo root
# Usage: docker build -f apps/server/Dockerfile -t omnia-server .

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS deps

WORKDIR /app

# Copy workspace manifests first — changes rarely, maximizes cache hits
COPY package.json bun.lock                ./
COPY apps/server/package.json             ./apps/server/
COPY packages/api/package.json            ./packages/api/
COPY packages/auth/package.json           ./packages/auth/
COPY packages/config/package.json         ./packages/config/
COPY packages/core/package.json           ./packages/core/
COPY packages/db/package.json             ./packages/db/
COPY packages/env/package.json            ./packages/env/
COPY packages/rag/package.json            ./packages/rag/
COPY packages/types/package.json          ./packages/types/

RUN bun install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM deps AS builder

# Copy sources after deps to preserve cache on dependency-only changes
COPY tsconfig.json                        ./
COPY apps/server/src                      ./apps/server/src
COPY apps/server/tsconfig.json            ./apps/server/
COPY apps/server/tsdown.config.ts         ./apps/server/
COPY packages/                            ./packages/

# tsdown bundles all @omnia/* workspace packages into dist/index.mjs (noExternal)
RUN cd apps/server && bun run build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copy bundled output — all @omnia/* already inlined by tsdown
COPY --from=builder /app/apps/server/dist ./dist

# Copy hoisted node_modules and remove @omnia/* workspace symlinks
# (they point to source dirs that don't exist here; bundled output doesn't need them)
COPY --from=builder /app/node_modules     ./node_modules
RUN rm -rf node_modules/@omnia && chown -R app:app /app

USER app

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.mjs"]
