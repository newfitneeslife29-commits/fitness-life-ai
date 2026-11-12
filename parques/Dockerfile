# Servidor de Parqués (cuentas, partidas online, pagos) + la versión web del juego.
# Railway lo construye con este archivo (carpeta raíz `parques`). Escucha en $PORT.
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# Dependencias (incluye las de desarrollo: hacen falta para compilar la web y ejecutar TypeScript con tsx).
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --include=dev --no-audit --no-fund

COPY packages packages
COPY apps/server apps/server
COPY apps/web apps/web
RUN npm run build -w @parques/web

EXPOSE 3001
CMD ["npm", "run", "start", "-w", "@parques/server"]
