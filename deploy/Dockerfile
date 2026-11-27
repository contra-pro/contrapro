# Build artifact only. No image was built or started during A5.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/infrastructure/database/package.json packages/infrastructure/database/package.json
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
COPY --chown=node:node scripts/application-start.mjs scripts/deployment-environment.mjs ./scripts/
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","scripts/application-start.mjs"]

FROM node:24-bookworm-slim AS worker
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node scripts/maintenance-worker.mjs ./scripts/maintenance-worker.mjs
COPY --chown=node:node scripts/worker-health.mjs ./scripts/worker-health.mjs
COPY --chown=node:node scripts/deployment-environment.mjs ./scripts/deployment-environment.mjs
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node","scripts/worker-health.mjs","/tmp/contratpro-worker-health.json","--live"]
CMD ["node","scripts/maintenance-worker.mjs"]
