# syntax=docker/dockerfile:1

# Production dependencies in a separate stage: the final image carries neither
# npm nor the development tree.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app

# The same UID that owns /data on the server: when it does not match, SQLite
# answers "readonly database" and it looks like an application bug.
RUN addgroup -S -g 10001 app && adduser -S -u 10001 -G app app

COPY --from=deps --chown=10001:10001 /app/node_modules ./node_modules
COPY --chown=10001:10001 package.json ./
COPY --chown=10001:10001 src ./src

USER 10001:10001
EXPOSE 4000

# No port published on the host: health is asked inside the container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node src/cli.js health || exit 1

CMD ["node", "src/bootstrap/server.js"]