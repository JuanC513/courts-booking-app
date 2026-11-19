# El contexto de build es la raíz del repositorio (ver docker-compose.yml),
# por eso las rutas empiezan con backend-node/ y se puede copiar docs/openapi.yaml.

# ---------- Etapa 1: compilar TypeScript ----------
FROM node:26-alpine AS build
WORKDIR /app/backend-node

# Primero solo los manifiestos: si no cambian, Docker reutiliza la capa de npm ci
COPY backend-node/package.json backend-node/package-lock.json ./
RUN npm ci

COPY backend-node/tsconfig.json ./
COPY backend-node/src ./src
RUN npm run build

# ---------- Etapa 2: imagen final, solo lo necesario para ejecutar ----------
FROM node:26-alpine
ENV NODE_ENV=production
WORKDIR /app/backend-node

COPY backend-node/package.json backend-node/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/backend-node/dist ./dist

# Misma estructura que en el repositorio: dist/openapi.js busca ../../docs/openapi.yaml
COPY docs/openapi.yaml /app/docs/openapi.yaml

# No ejecutar como root: la imagen oficial ya trae el usuario "node"
USER node

EXPOSE 3000
CMD ["node", "dist/server.js"]