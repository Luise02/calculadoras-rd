# CalculaRD — calculadoras financieras para República Dominicana

Sitio estático hecho con [Astro](https://astro.build). No necesita servidor ni base de datos: todos los cálculos
corren en el navegador del visitante.

## Correr el sitio en tu PC

```bash
npm install
npm run dev      # abre http://localhost:4321
npm test         # corre las pruebas de las fórmulas
npm run build    # genera el sitio final en la carpeta dist/
```

## Estructura

| Carpeta / archivo | Qué contiene |
|---|---|
| `src/lib/finanzas.ts` | **Toda la lógica de cálculo** y las tasas vigentes (`CONFIG`). Aquí se actualiza el ISR y la TSS cada año. |
| `tests/finanzas.test.ts` | Pruebas con casos conocidos para verificar que las fórmulas no se rompan. |
| `src/pages/` | Una página por calculadora + páginas legales. El nombre del archivo es la URL. |
| `src/layouts/Base.astro` | Encabezado, pie de página, SEO y el script de AdSense. |
| `src/components/AdSlot.astro` | Espacio para anuncio (invisible hasta configurar AdSense). |
| `src/site.ts` | Nombre del sitio, correo y lista de herramientas. |
| `astro.config.mjs` | URL del dominio (cámbiala cuando lo compres). |

## Checklist de mantenimiento

- [ ] **Enero 2027:** cambiar la escala del ISR en `CONFIG.isr` por la de la Ley 30-26.
- [ ] Cada vez que suba el salario mínimo cotizable: actualizar `CONFIG.tss.salarioMinimoCotizable`.
- [ ] Después de cada cambio: `npm test`.

## Activar AdSense (cuando te aprueben)

1. Copia `.env.example` como `.env` y pon tu ID: `PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXX`.
2. En cada página, pasa el ID del bloque al componente: `<AdSlot slot="1234567890" />`.
3. Agrega `public/ads.txt` con la línea que te da AdSense.
