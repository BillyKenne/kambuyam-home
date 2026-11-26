# Kambuyam Home (AdonisJS) : image pour n'importe quel hébergeur qui accepte Docker.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN node ace build && cd build && npm ci --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3333 LOG_LEVEL=info SESSION_DRIVER=cookie TZ=UTC
WORKDIR /app
COPY --from=build /app/build ./
EXPOSE 3333
# APP_KEY doit être fourni par l'hébergeur (variable secrète).
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
