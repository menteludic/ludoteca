# syntax=docker/dockerfile:1

# Dependencias de producción en una etapa aparte: la imagen final no lleva npm
# ni el árbol de desarrollo.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app

# El mismo UID que el dueño de /data en el servidor: si no coincide, SQLite
# responde «readonly database» y parece un fallo de la aplicación.
RUN addgroup -S -g 10001 app && adduser -S -u 10001 -G app app

COPY --from=deps --chown=10001:10001 /app/node_modules ./node_modules
COPY --chown=10001:10001 package.json ./
COPY --chown=10001:10001 src ./src

USER 10001:10001
EXPOSE 4000

# Sin puerto publicado en el host: la salud se pregunta dentro del contenedor.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node src/cli.js health || exit 1

CMD ["node", "src/bootstrap/server.js"]