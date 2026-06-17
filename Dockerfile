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

# Los secretos (DATABASE_URL, OPENAI_API_KEY) se inyectan como variables de
# entorno del contenedor (p. ej. desde la UI de Easypanel), NUNCA en la imagen.
# Al arrancar: aplica migraciones pendientes y levanta el servidor en :3000.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
