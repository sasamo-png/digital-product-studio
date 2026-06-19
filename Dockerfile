# syntax=docker/dockerfile:1
# Imagen de producción para Digital Product Studio (Next.js + Prisma).
# Usable directamente por Easypanel (build desde el repo) o `docker build`.

FROM node:20-bookworm-slim

WORKDIR /app

# openssl es necesario para los query engines de Prisma.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Instalar dependencias (incluye dev: se necesitan para compilar).
# Copiamos prisma antes para que el postinstall (prisma generate) encuentre el schema.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Copiar el resto del código y compilar.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Healthcheck sin dependencias externas (la imagen slim no trae curl).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

# DATABASE_URL se inyecta como variable de entorno del contenedor (p. ej. desde
# la UI de Easypanel), NUNCA en la imagen. La app es BYOK: no necesita OPENAI_API_KEY.
# Al arrancar: espera a que la BD acepte conexiones (reintentos) y aplica las
# migraciones con el prisma local. Si tras los reintentos las migraciones NO se
# aplican, el contenedor ABORTA (exit 1) en lugar de servir contra una BD sin
# migrar, para que el orquestador lo marque como caído.
CMD ["sh", "-c", "ok=0; for i in 1 2 3 4 5 6 7 8 9 10; do node_modules/.bin/prisma migrate deploy && { ok=1; break; }; echo 'BD no lista, reintento en 3s...'; sleep 3; done; if [ \"$ok\" != 1 ]; then echo 'Migraciones no aplicadas; abortando.'; exit 1; fi; exec npm run start"]
