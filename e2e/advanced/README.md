# Flujo avanzado de cocina (Playwright)

Suite dedicada al modo **Avanzado**: configuración, estación, comanda desde el
POS, impresión simulada, transiciones, pase, historial, bandeja de recientes,
refire y el caso de una cuenta **KITCHEN sin estación**.

## Ejecutar

```bash
cd web
npm run test:e2e:advanced
```

Por defecto reutiliza los servidores locales:

- Web: `http://localhost:3000`
- API: `http://localhost:3001/v1`

Si no están levantados, Playwright los compila y arranca (igual que la suite
móvil). La corrida usa un solo worker porque cambia el modo de cocina de la
sucursal y crea datos de prueba.

## Variables

- `E2E_BASE_URL` — URL de la web (`http://localhost:3000`).
- `E2E_API_URL` — URL base de la API (`http://localhost:3001/v1`).
- `E2E_EMAIL` / `E2E_PASSWORD` — cuenta con rol ADMIN. La sesión se guarda en
  `e2e/mobile/.auth/user.json`.

## Datos que prepara

- Sucursal `E2E Sucursal` si la organización no tiene ninguna.
- Estación `A E2E Parrilla` (se reutiliza si ya existe).
- Producto `E2E Hamburguesa` con SKU `E2E-KITCHEN` (se reutiliza si ya existe).
- Comanda de mostrador con un cliente único por corrida.
- Usuario `e2e-kitchen` con rol KITCHEN, sin posición de brigada ni estaciones.
  El spec lo crea o resetea con la sesión ADMIN, cambia su contraseña inicial y
  comprueba que no ve configuración ni tickets de estación.

Al terminar, el modo de cocina vuelve al valor inicial. La sucursal, estación,
producto, usuario y comandas quedan en la base local para que la suite sea
repetible.

## Impresión

La prueba reemplaza `window.print()` para verificar que se invoca y que el área
`.kitchen-print-area` contiene la estación y el platillo. La salida física
depende de la impresora instalada en el equipo; el procedimiento y la lista de
verificación están en `docs/cocina-operativa.md`.
