// Configuración de PM2 para mantener viva la app en el puerto 3000.
//   Arrancar:  pm2 start ecosystem.config.js
//   Guardar:   pm2 save && pm2 startup   (reinicio automático al bootear)
//
// NOTA DE SEGURIDAD: aquí NO van secretos. Next.js carga DATABASE_URL
// automáticamente desde el archivo .env (o .env.production) ubicado en `cwd`.
// Ese archivo se crea a mano en el VPS y nunca se commitea. La app es BYOK: no
// usa OPENAI_API_KEY de servidor.
//
// IMPORTANTE: PM2 no ejecuta migraciones. Antes de (re)arrancar, corre:
//   npx prisma migrate deploy   (o: npm run db:migrate)
module.exports = {
  apps: [
    {
      name: "digital-product-studio",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
