# Independent dependency-free HTTP scheduler process; no image built in C2.
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node scripts/maintenance-worker.mjs scripts/worker-health.mjs scripts/deployment-environment.mjs ./scripts/
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node","scripts/worker-health.mjs","/tmp/contratpro-worker-health.json","--live"]
CMD ["node","scripts/maintenance-worker.mjs"]
