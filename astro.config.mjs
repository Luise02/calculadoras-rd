import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// En GitHub Pages el flujo de publicación define SITE_URL y BASE_PATH automáticamente.
// Cuando tengas dominio propio, cambia la URL por defecto y deja BASE_PATH sin definir.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://www.ejemplo-calculadoras.com',
  base: process.env.BASE_PATH ?? '/',
  integrations: [sitemap()],
});
