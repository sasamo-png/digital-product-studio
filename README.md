# Digital Product Studio

Plataforma propia para **crear y gestionar productos digitales con ayuda de IA**:
investigación de mercado, generación de ebooks, estudio de contenido para redes,
constructor de embudos de venta, asistente de ventas y panel de analítica.

Toda la lógica de IA se ejecuta **en el servidor** (route handlers); la API key
nunca llega al cliente.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + componentes estilo **shadcn/ui**
- **Prisma ORM** con **SQLite** en desarrollo (migrable a Postgres)
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

Requisitos: **Node.js 18+** y npm.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
#    Copia la plantilla y rellena tu API key (lado servidor; nunca se commitea)
cp .env.example .env.local
#    Edita .env.local y pon tu clave:
#    OPENAI_API_KEY=sk-...
#    OPENAI_MODEL=gpt-4o-mini   (opcional; también editable en /settings)

# 3. Crear la base de datos SQLite y el cliente Prisma
npx prisma db push

# 4. Arrancar en desarrollo
npm run dev
# → http://localhost:3000
```

> En Windows: `cp .env.example .env.local` también funciona en PowerShell;
> alternativamente usa `Copy-Item .env.example .env.local`.

### Otros comandos

```bash
npm run build      # build de producción (ejecuta prisma generate)
npm start          # servir el build de producción
npm run db:studio  # inspeccionar la base de datos (Prisma Studio)
```

## Seguridad

- La API key vive **solo** en `.env.local` (en `.gitignore`), nunca en el cliente
  ni en variables `NEXT_PUBLIC_*`.
- Toda llamada al LLM se encapsula en `app/api/**/route.ts` (lado servidor).
- Los módulos de IA están marcados con `server-only` para impedir su importación
  desde el cliente.

## Modelo de datos

Entidades Prisma (ver [`prisma/schema.prisma`](prisma/schema.prisma)):
`Product`, `Ebook`, `MarketResearch`, `Competitor`, `Content`, `Funnel`,
`Campaign`, `Customer`, `Sale`, `Analytics`, `Settings`.

> Nota: SQLite no soporta los tipos `Json`/`enum` de Prisma, por lo que los
> campos JSON se almacenan como `String` serializado y los estados como `String`.
> Al migrar a Postgres pueden promoverse a `Json`/`enum`.
