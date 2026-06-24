# DATABASE — POS MH Tiendita

Esquema PostgreSQL en Supabase (**20 tablas**, proyecto `lisjbutidntalmobgjso`).

## Migraciones (4, aplicadas en la BD — repo == BD)
| # | Archivo | Contenido |
|---|---------|-----------|
| 001 | `001_initial_schema.sql` | 20 tablas + índices + extensiones (`uuid-ossp`, `pg_trgm`) |
| 002 | `002_rls.sql` | RLS en todas las tablas + helpers `get_negocio_id()`/`get_user_rol()` (SECURITY DEFINER) + políticas por negocio |
| 003 | `003_functions.sql` | RPC `registrar_negocio(p_auth_user_id, p_nombre_negocio, p_nombre_visible, p_email)` → `json`, SECURITY DEFINER, **EXECUTE solo `service_role`** (alta atómica del tenant) |
| 004 | `004_storage_realtime.sql` | Bucket público `negocio-assets` + políticas de `storage.objects` + publicación Realtime (`scan_events`, `carrito_items`, `carritos_activos`) |

Además, **triggers de `updated_at`** creados en la BD (actualizan la columna en cada UPDATE).

## Extensiones

- `uuid-ossp` — generación de UUIDs (`uuid_generate_v4()`).
- `pg_trgm` — búsqueda difusa de productos por texto (índice GIN sobre `productos.nombre`).

## Modelo de tenant

```
auth.users (Supabase Auth)
     │ 1:1
     ▼
  usuarios ──────────────┐
     │ N:1                │ N:1
     ▼                    ▼
  negocios  ◄── (raíz del tenant) todo lo demás cuelga de aquí vía negocio_id
```

- **`negocios`** es la raíz del tenant. Todo dato operativo lleva `negocio_id NOT NULL`.
- **`usuarios`** vincula un `auth.users.id` (Supabase Auth) con un `negocio_id` y un `rol`
  (`dueno` | `cajero` | `admin`). El aislamiento de datos es **por negocio**, no por usuario.
- El RLS filtra por `negocio_id = get_negocio_id()` (ver sección RLS).

## Tablas

### Núcleo del tenant
| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `negocios` | Raíz del tenant | `id`, `nombre`, `slug` (único), `plan`, `activo` |
| `usuarios` | Miembros del negocio | `id`, `auth_user_id`→`auth.users`, `negocio_id`→`negocios`, `rol`, `nombre_visible` |
| `sucursales` | Multi-sucursal (opcional) | `id`, `negocio_id`, `nombre`, `direccion` |
| `configuracion_negocio` | Config 1:1 por negocio | `negocio_id` (único), branding, banderas (`activar_mayoreo`, `permitir_venta_sin_stock`, `abrir_caja_obligatorio`…), `iva_porcentaje` |

### Catálogo
| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `categorias_producto` | Categorías | `negocio_id`, `nombre`, `color`, `icono`, `orden` |
| `proveedores` | Proveedores | `negocio_id`, `nombre`, contacto/teléfono/whatsapp |
| `productos` | Catálogo de productos | `negocio_id`, `categoria_id`, `proveedor_id`, `nombre`, `sku`, `codigo_barras`, `unidad_venta`, `precio_venta`, `costo_unitario`, `stock_actual`, `stock_minimo`, mayoreo |

### Ventas y caja
| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `cortes_caja` | Apertura/cierre de caja | `negocio_id`, `sucursal_id`, `cajero_id`, `estado` (`abierta`/`cerrada`), fondos, totales, utilidades |
| `ventas` | Cabecera de venta | `negocio_id`, `corte_id`, `cajero_id`, `folio` (único por negocio), `estado` (`abierta`/`pagada`/`cancelada`), totales y **snapshots** de costo/utilidad/margen, `metodo_pago`, `motivo_cancelacion` |
| `detalle_ventas` | Renglones de venta | `venta_id`, `negocio_id`, `producto_id`, snapshots de precio/costo, `cantidad`, `descuento`, `total` |

### Compras, inventario y gastos
| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `compras_mercancia` | Cabecera de compra a proveedor | `negocio_id`, `proveedor_id`, `fecha`, `total`, `metodo_pago` |
| `detalle_compras` | Renglones de compra | `compra_id`, `negocio_id`, `producto_id`, `cantidad_compra`, `unidad_compra`, `piezas_por_caja`, `cantidad_stock_agregada`, costos |
| `movimientos_inventario` | Kardex de stock | `negocio_id`, `producto_id`, `tipo_movimiento` (`entrada_compra`/`salida_venta`/`ajuste`/`merma`/`devolucion`/`cancelacion`), `stock_anterior`, `stock_nuevo`, `referencia_tipo`/`referencia_id` |
| `gastos_operativos` | Gastos del negocio | `negocio_id`, `corte_id`, `concepto`, `categoria`, `monto`, `fecha`, `recurrente` |

### Carrito (relacional, reemplaza `items_json`)
| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `carritos_activos` | Carrito en curso por corte/cajero | `negocio_id`, `corte_id`, `cajero_id`, `estado`, totales, `cantidad_items`, `version` (control de concurrencia optimista) |
| `carrito_items` | Renglones del carrito | `carrito_id`, `negocio_id`, `producto_id`, `cantidad`, `precio_unitario`, `descuento`, `subtotal`, `es_mayoreo` |

### Escáner móvil / Suscripción / Reportes / Auditoría
| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `scan_events` | Eventos del escáner móvil → POS | `negocio_id`, `corte_id`, `device_id`, `source_device`, `codigo_barras`, `producto_id`, `estado` (`pendiente`/`procesado`/`error`/`descartado`) |
| `suscripciones` | Estado de Stripe por negocio | `negocio_id` (único), `stripe_customer_id`, `stripe_subscription_id`, `estado`, periodos, `trial_*` |
| `reportes_generados` | Snapshots de reportes | `negocio_id`, `tipo`, `titulo`, periodo, métricas financieras, **`datos_snapshot jsonb`** (nativo, no string) |
| `audit_log` | Trazabilidad (cancelaciones, ajustes) | `negocio_id`, `usuario_id`, `accion`, `entidad`, `entidad_id`, `payload jsonb`, `ip` |

## Índices

| Índice | Tabla | Propósito |
|--------|-------|-----------|
| `productos_negocio_idx` | `productos(negocio_id)` | Filtrado por tenant |
| `productos_barcode_idx` | `productos(negocio_id, codigo_barras)` parcial | Lookup por código de barras |
| `productos_nombre_trgm_idx` | `productos` GIN `gin_trgm_ops` | Búsqueda difusa por nombre |
| `ventas_negocio_fecha_idx` | `ventas(negocio_id, fecha desc)` | Listados/reportes recientes |
| `ventas_corte_idx` | `ventas(corte_id)` | Ventas de un corte |
| `detalle_ventas_venta_idx` / `_negocio_idx` | `detalle_ventas` | Renglones por venta/tenant |
| `detalle_compras_compra_idx` | `detalle_compras(compra_id)` | Renglones por compra |
| `movimientos_inventario_*` | `movimientos_inventario` | Kardex por tenant/producto |
| `carrito_items_carrito_idx` | `carrito_items(carrito_id)` | Renglones del carrito |
| `scan_events_corte_idx` | `scan_events(corte_id, created_at desc)` | Realtime del escáner por corte |
| `audit_log_negocio_idx` | `audit_log(negocio_id, created_at desc)` | Auditoría por tenant |

> Nota: algunos índices auxiliares (`detalle_*`, `movimientos_*`) se añadieron además
> de los explícitos en el prompt para soportar los joins habituales. Ver `docs/DECISIONS.md`.

## Row Level Security (RLS)

RLS habilitado en **todas** las tablas. Helpers (`SECURITY DEFINER`, para evitar
recursión en las políticas de `usuarios`):

- `get_negocio_id()` → `negocio_id` del usuario autenticado (`auth.uid()`).
- `get_user_rol()` → `rol` del usuario autenticado.

Patrón de políticas:

| Tabla(s) | SELECT | INSERT | UPDATE | DELETE |
|----------|--------|--------|--------|--------|
| Operativas (productos\*, ventas, detalle_*, cortes_caja, compras, gastos, carrito*, scan_events, reportes, categorias, proveedores, sucursales, configuracion) | miembro | miembro | miembro | miembro |
| `productos` (excepción) | miembro | miembro | miembro | **solo `dueno`** |
| `negocios` | propio negocio | (service role) | propio negocio | — |
| `usuarios` | mismo negocio | (service role) | solo perfil propio | — |
| `suscripciones` | **solo `dueno`** | (webhook service role) | **solo `dueno`** | — |
| `audit_log` | miembro | **solo service role (server)** | — | — |

- "miembro" = `negocio_id = get_negocio_id()`.
- Las creaciones de `negocios`/`usuarios` y las escrituras de `audit_log`/`suscripciones`
  ocurren **server-side** con la `service_role` key, que ignora RLS.
- Restricciones de rol adicionales (más allá de las anteriores) se aplican en las API Routes.

## Alta de tenant (RPC)

`registrar_negocio` (migración 003) crea en **una transacción**: `negocios` + `usuarios` (rol `dueno`)
+ `configuracion_negocio` + `suscripciones`, y devuelve `{ negocio_id, usuario_id }`. La invoca
`POST /api/negocio/register` con la **service role key** (es la única que puede ejecutarla tras el hardening).

## Estado / pendientes
- **Hechos:** triggers `updated_at` ✓ · publicación Realtime ✓ · bucket `negocio-assets` ✓ · RPC endurecida ✓.
- **Pendiente (ver [`docs/BUGS_PENDING.md`](./BUGS_PENDING.md)):** lectura de `suscripciones` para cajeros
  (hoy solo `dueno`); acotar escritura del bucket por carpeta `negocio_id/`; auditoría server-side de cancelaciones.

<!-- Última actualización: 2026-06-24 — Sesión de migración Base44 → Next.js 14 + Supabase -->
