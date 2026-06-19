# Digital Product Studio

Plataforma propia para **crear y gestionar productos digitales con ayuda de IA**:
investigación de mercado, generación de ebooks, estudio de contenido para redes,
constructor de embudos de venta, asistente de ventas y panel de analítica.

Toda la lógica de IA se ejecuta **en el servidor** (route handlers). La app es
**BYOK** (_Bring Your Own Key_): cada usuario introduce su propia API key de
OpenAI en `/settings`; se guarda solo en su navegador y nunca se persiste.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + componentes estilo **shadcn/ui**
- **Prisma ORM** con **PostgreSQL** (en todos los entornos)
- **OpenAI** con _structured outputs_ (JSON Schema) validados con **zod**
- **Recharts** para las gráficas de analítica
- **lucide-react** para iconos

## Módulos

| Ruta | Descripción |
|------|-------------|
| `/` | Landing pública |
| `/dashboard` | Centro de control: KPIs, accesos directos y actividad reciente |
| `/market-research` | Análisis de nichos con IA (demanda, competencia, rentabilidad, competidores) |
| `/product-builder` | Catálogo de productos (placeholder, pendiente de CRUD) |
| `/ebook-generator` | Generación de ebooks con IA (capítulos, portada, copy de venta) |
| `/content-studio` | Contenido multiplataforma (Instagram, TikTok, X, Facebook, email) |
| `/funnel-builder` | Embudos de venta (landing, página de ventas, secuencia de emails, upsells) |
| `/sales-assistant` | Scripts de venta: DMs, manejo de objeciones y cierre |
| `/analytics` | Métricas de negocio con gráficas (ingresos, conversión, top productos) |
| `/settings` | Preferencias (modelo de IA por defecto, tono de marca) |

### Arquitectura de IA

Cada módulo sigue el mismo patrón:

```
lib/ai/<modulo>.ts          → esquemas zod (entrada/salida) + JSON Schema
   ├─ lib/ai/openai.ts       → cliente OpenAI + modelo activo (server-only)
   └─ lib/ai/structured.ts   → wrapper común: llamada + parseo + validación zod
app/api/<modulo>/.../route.ts → valida (zod) → genera (IA) → persiste (Prisma)
app/(app)/<modulo>/page.tsx   → UI cliente (formulario, estados, resultados)
```

## Cómo ejecutar en local

Requisitos: **Node.js 18+**, npm y un **PostgreSQL** (puedes levantarlo con Docker).

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
#    Ajusta DATABASE_URL si usas otro Postgres. NO necesitas OPENAI_API_KEY:
#    la app es BYOK (cada usuario pone su key en /settings).

# 3. Levantar PostgreSQL local (opción rápida con Docker)
docker compose up -d db

# 4. Aplicar las migraciones y generar el cliente Prisma
npx prisma migrate deploy
npx prisma generate

# 5. Arrancar en desarrollo
npm run dev
# → http://localhost:3000
```

> En Windows: `cp .env.example .env` también funciona en PowerShell;
> alternativamente usa `Copy-Item .env.example .env`.

### Otros comandos

```bash
npm run build      # build de producción (ejecuta prisma generate)
npm start          # servir el build de producción
npm run db:migrate # aplicar migraciones (prisma migrate deploy)
npm run db:studio  # inspeccionar la base de datos (Prisma Studio)
```

## Seguridad

- **BYOK**: la API key de cada usuario se guarda solo en su navegador y se envía
  por cabecera en cada generación; el servidor **no** la persiste ni usa ninguna
  `OPENAI_API_KEY` de entorno.
- Toda llamada al LLM se encapsula en `app/api/**/route.ts` (lado servidor).
- Los módulos de IA están marcados con `server-only` para impedir su importación
  desde el cliente.

## Modelo de datos

Entidades Prisma (ver [`prisma/schema.prisma`](prisma/schema.prisma)):
`Product`, `Ebook`, `MarketResearch`, `Competitor`, `Content`, `Funnel`,
`Campaign`, `Customer`, `Sale`, `Analytics`, `Settings`.

> Nota: por compatibilidad histórica, algunos campos JSON se almacenan como
> `String` serializado y los estados como `String`. En PostgreSQL podrían
> promoverse a `Json`/`enum` nativos en una migración futura (mejora opcional).
