# ARCO POLÍTICO

Campañas para posicionar partidos o personas sobre un arco ideológico (rojo → gris → azul). Next.js + TypeScript + Tailwind + Postgres (Supabase).

## Arranque
```bash
npm install
# Postgres (Supabase o local): ejecuta supabase/schema.sql y define DATABASE_URL en .env.local
npm run dev
npm test        # prueba de humo de la API (servidor en marcha): node scripts/smoke.mjs [URL]
```

## Variables de entorno
- `DATABASE_URL`: Postgres (Neon/Supabase). El esquema se aplica solo en el build (`scripts/migrate.mjs`).
- `SUPERADMIN_PASSWORD`: contraseña del panel `/super` (mín. 8 caracteres). Sin ella, el panel está desactivado.

## Estructura
- `app/` páginas (`/`, `/c/[slug]`, `/admin/[token]`) y API (`app/api`).
- `components/Arc.tsx` arco interactivo (arrastre + sliders sincronizados).
- `lib/stats.ts` media, mediana, distribución y umbrales (5 participantes / 5 valoraciones por elemento), calculados en servidor.
- `supabase/schema.sql` esquema mínimo: `campaigns`, `items`, `responses` (RLS activado; acceso solo desde el servidor).

## Seguridad básica
Token de administración aleatorio (solo se guarda su hash), identidad anónima por cookie httpOnly emitida por el servidor (se guarda su hash), validación con zod, fotos reducidas a 160 px y limitadas por tamaño, la conexión a la base de datos solo existe en el servidor (`DATABASE_URL`).
