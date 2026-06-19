# Digital Product Studio — Guía del proyecto

## Objetivo
Plataforma propia para crear y gestionar productos digitales con ayuda de IA:
investigación de mercado, generación de ebooks, estudio de contenido para redes,
constructor de embudos de venta, asistente de ventas y panel de analítica.

Esta es una implementación nueva e independiente. Inspirada conceptualmente en un
blueprint de referencia, pero TODO el código debe ser original. No copiar código
de terceros ni depender de plataformas externas propietarias.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui para componentes
- Prisma ORM con PostgreSQL en todos los entornos (docker-compose en local)
- Llamadas a LLM SOLO desde el servidor (route handlers / server actions)
- Recharts para gráficas de analítica
- lucide-react para iconos

## Reglas de seguridad (importantes)
- BYOK: cada usuario aporta su API key de OpenAI desde `/settings`; se guarda
  solo en su navegador (localStorage) y se envía por cabecera `x-openai-key`.
- El servidor NUNCA persiste la key ni usa una `OPENAI_API_KEY` de entorno.
- `.env` debe estar en `.gitignore` (DATABASE_URL es el único secreto local).
- Toda llamada al LLM se encapsula en `/app/api/**/route.ts` (lado servidor).
- Nunca exponer secretos en componentes cliente ni en variables `NEXT_PUBLIC_*`.

## Páginas (rutas)
- `/`               Landing pública
- `/dashboard`      Centro de control
- `/market-research` Análisis de nichos con IA
- `/product-builder` Creación de productos digitales
- `/ebook-generator` Generación de ebooks con IA
- `/content-studio`  Contenido multiplataforma (IG, TikTok, X, email)
- `/funnel-builder`  Embudos de venta (landing, emails, upsells)
- `/sales-assistant` Scripts de venta y respuestas a objeciones
- `/analytics`       Métricas de negocio
- `/settings`        Cuenta y preferencias

## Entidades (modelo de datos)
MarketResearch, Product, Ebook, Content, Funnel, Campaign,
Customer, Sale, Analytics, Competitor.
(Las relaciones se definen en schema.prisma — ver primer prompt.)

## Convenciones
- Componentes en PascalCase, hooks en camelCase con prefijo `use`.
- Lógica de IA aislada en `lib/ai/` con funciones tipadas (entrada/salida).
- Validación de entradas con zod en cada route handler.
- Commits pequeños y descriptivos; correr `npm run build` antes de dar por hecho un módulo.

## Flujo de trabajo esperado
Avanzar módulo por módulo. Tras cada módulo: ejecutar el build, corregir errores,
y proponer un commit. No generar toda la app de una sola vez.