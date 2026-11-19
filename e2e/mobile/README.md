# Pruebas móviles (Playwright)

Matriz de teléfono y tablet, vertical y horizontal:

| Proyecto | Viewport |
|---|---|
| `phone-360x800` | 360 × 800 |
| `phone-390x844` | 390 × 844 |
| `phone-landscape-844x390` | 844 × 390 |
| `tablet-820x1180` | 820 × 1180 |
| `tablet-landscape-1180x820` | 1180 × 820 |
| `desktop-1440x900` | 1440 × 900 |

## Ejecutar

```bash
cd web
npm run test:e2e
```

Si no hay servidores levantados, Playwright compila la web y la arranca en
producción sobre `http://localhost:3000`; la API se reutiliza si ya está en
`:3001` o se inicia con `npm run start:dev`.

La sesión se crea una sola vez con el admin local del seed
(`admin@naranjapimienta.local` / `Naranja123!`) y se guarda en
`e2e/mobile/.auth/user.json` (ignorado por git).

Variables opcionales:

- `E2E_BASE_URL` (por defecto `http://localhost:3000`).
- `E2E_EMAIL` y `E2E_PASSWORD` para usar otra cuenta.

## Cobertura

- Sin scroll horizontal en las rutas principales.
- Barra inferior por debajo de 1024 px y sidebar desde 1024 px.
- Navegación de la barra y apertura del sidebar completo.
- Comanda como bottom sheet y pill flotante antes de `xl`.
- Presentaciones del platillo en 2 columnas en teléfono y 3 desde tablet.
- Cocina con tabs en vertical y tres columnas con scroll en horizontal.
- Editor de producto a pantalla completa, “Guardar como” primero y cards de
  presentaciones.
- Persistencia de `Mostrar KPIs` en catálogo e inventario.
