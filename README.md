# Ventas e inventario

Punto de venta, inventario y reportes para una tienda de barrio. Pesos colombianos, hora de Bogotá.

- **Resumen** (`/`): ventas de hoy, ingresos y ganancia del mes, tendencia, lo más vendido y productos por reponer.
- **Vender** (`/pos`): búsqueda o lector de código de barras, carrito, cobro con cambio (F8 → Enter cobra exacto).
- **Ventas** (`/ventas`): historial con filtros, cierre de caja, detalle, anulación e impresión de tirilla (80 mm).
- **Productos** (`/productos`) y **Categorías** (`/categorias`).
- **Inventario** (`/inventario`): compras, salidas, ajustes, devoluciones y la bitácora completa.
- **Configuración** (`/configuracion`): nombre, NIT, dirección y teléfono que salen en la tirilla.

## Stack

Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 + PostgreSQL · Zod · Zustand · Recharts

## Puesta en marcha

Requisitos: Node 22+ y PostgreSQL.

```bash
npm install                     # también genera el cliente de Prisma
cp .env.example .env            # y escribe tu usuario/contraseña de PostgreSQL
npm run db:migrate              # crea las tablas
npm run db:seed                 # opcional: 60 días de datos de ejemplo
npm run dev                     # http://localhost:3000
```

Para usarla desde una tablet o celular en la misma red: `npm run build && npm start` y abre `http://<IP-del-PC>:3000`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar y servir en producción |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Aplica cambios del schema (`prisma migrate dev`) |
| `npm run db:seed` | Borra y recarga los datos de ejemplo (no toca la configuración de la tienda) |
| `npm run db:reset` | Borra la base, reaplica migraciones y corre el seed |
| `npm run db:studio` | Ver y editar los datos en el navegador |

## Decisiones importantes

- **Dinero en centavos (`Int`)**: `$ 3.500` se guarda como `350000`. Sin errores de punto flotante.
- **El stock solo cambia con movimientos**: cada venta, compra, ajuste o anulación crea un `InventoryLog` con el stock antes y después, en la misma transacción. El stock de un producto siempre es igual a la suma de su bitácora.
- **Sin sobreventa**: los descuentos de stock son updates condicionales (`stock >= cantidad`); dos cajas vendiendo la última unidad a la vez no la venden dos veces.
- **Ventas idempotentes**: cada cobro lleva un `clientRequestId`; un reintento por mala conexión no duplica la venta.
- **Snapshot de precios**: cada línea de venta guarda el precio y costo del momento, así los reportes no cambian si luego cambias precios.
- **Nada se borra**: los productos se archivan y las ventas se anulan (devolviendo el stock).

## Estructura

```
prisma/              schema, migraciones y seed
src/app/(dashboard)/ rutas (páginas delgadas que componen features)
src/features/        un módulo por dominio: queries, actions (Server Actions), schemas (Zod), services, components
  analytics/  categories/  inventory/  products/  sales/  settings/
src/components/      piezas de UI compartidas
src/lib/             db, dinero, fechas (zona Bogotá), utilidades
```
