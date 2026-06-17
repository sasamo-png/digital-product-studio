# Spec — Apartado "Tu API Key" (BYOK)

Fecha: 2026-06-17

## Objetivo
Permitir compartir la app con amigos para que cada uno use **su propia** API key
de OpenAI, sin que usen la del dueño. La app no tiene autenticación.

## Decisiones
- **BYOK por navegador**: cada usuario introduce su key; se guarda solo en su
  `localStorage`; se envía en cada generación por cabecera; el servidor la usa al
  vuelo y **no la persiste ni la loguea**.
- **Sin fallback**: el servidor ya **no** usa `OPENAI_API_KEY` del entorno para
  generar. Sin key del usuario → 400.
- **HTTP por ahora** (sin dominio): aviso visible en la UI de que es solo pruebas.

## Diseño
### Cliente
- `lib/use-api-key.ts`: get/set/clear en `localStorage` (`dps.openai.key`) +
  `apiKeyHeaders()` → `{ "x-openai-key": <key> }`.
- `/settings`: card "Tu API Key" con input enmascarado, Guardar/Probar/Borrar,
  aviso de HTTP, y copy de privacidad actualizado.
- Componente `ApiKeyNotice`: banner en las 5 páginas de generación cuando no hay key.
- Las 5 páginas envían `apiKeyHeaders()` y manejan el error `NO_API_KEY`.

### Servidor
- `getOpenAIClient(apiKey)`: requiere key por parámetro; cliente nuevo por petición;
  `MissingApiKeyError` si falta. Ya no lee la key del entorno.
- `generateStructured` y las 5 `generateX(input, apiKey)` propagan la key.
- Cada route handler de generación: lee `x-openai-key`; falta → 400 `NO_API_KEY`;
  OpenAI 401 → "API key inválida".
- `POST /api/ai/validate`: valida la key con una llamada mínima (`models.list`).
- `getActiveModel()` (modelo, no secreto) se mantiene.

## Seguridad
Key solo en el navegador del usuario; transitoria en el servidor; nunca en
BD/logs/commits. Riesgo conocido: viaja por HTTP (avisado) hasta tener HTTPS.

## No incluye (YAGNI)
- Autenticación / cuentas. Persistencia de la key en servidor. Selección de modelo
  por usuario (sigue el del servidor).
