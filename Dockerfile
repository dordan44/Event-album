# SnapEvent — production image for Railway
FROM node:22-alpine AS deps
WORKDIR /app
# Prisma engines need OpenSSL to be present (and detected) on Alpine
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL is not needed at build time (prisma generate only reads the schema)
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
RUN addgroup -S app && adduser -S app -G app

# Everything the runtime touches is owned by the unprivileged user —
# prisma migrate deploy writes into node_modules/@prisma at startup.
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/server.js ./server.js
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/next.config.mjs ./next.config.mjs

USER app
EXPOSE 3000

# Apply pending migrations, then boot the custom Next+Socket.io server.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
