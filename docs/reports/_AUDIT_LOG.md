# AUDIT_LOG — Registro de reportes auditados

Control interno del auditor técnico. **Último reporte auditado: #009.**
Nunca se re-audita un reporte ya listado aquí.

| # | Fecha | IA | Tarea | Veredicto | Notas |
|---|-------|----|-------|-----------|-------|
| 001 | 2026-06-24 | claude-code | fix-bugs-ui | ✅ Conforme | 3 bugs UI corregidos y verificados en código. Commit `ec760d4`. Verificación en navegador confirmada por el director (2026-06-24). Sin bugs nuevos. |
| 002 | 2026-06-24 | claude-code | security-rate-limit-bucket | ✅ Conforme (con caveats) | Rate limit en `/register` + migración `005_storage_policy` aplicada a BD. Caveats: rate limit en memoria no global en serverless; upload sin validación MIME. Desviación justificada (tocó el route, no `configuracion.ts`). |
| 003 | 2026-06-24 | codex | audit-log-cancelacion | ⚠️ Conforme pero inalcanzable | Endpoint `/api/ventas/cancelar` creado, pero sin UI que lo consuma; no atómico (2 REST + reversión). `npm audit` high en deps. |
| 004 | 2026-06-24 | antigravity | rls-cajeros-sidebar | ❌ Con problemas | Colisión de migración `005`; `005_rls_cajeros` no aplicada a BD; violó arquitectura (Supabase directo en `layout.tsx`). Todo corregido luego por el reporte 005. |
| 005 | 2026-06-24 | claude-code | fix-migracion-colision-arquitectura | ✅ Conforme | Colisión `005→006` resuelta y aplicada a BD; `layout.tsx` ya no toca Supabase directo. Honesto sobre repo==BD (objetos sí; ledger con 2 desajustes preexistentes). Regresión reabierta: nombre del negocio vuelve a 'POS MH'. |
| 006 | 2026-06-24 | claude-code | negocio-nombre-ledger | ✅ Conforme | `getNegocio` + `useNegocio` (patrón de useConfig); `layout.tsx` muestra el nombre real sin Supabase directo — verificado. Ledger reconciliado: 004 registrado (`20260624214042`), 6 migraciones en orden — verificado vía `list_migrations`. Caveats: INSERT del prompt traía `version` colisionante con 003 (corregido); `useNegocio.js` es `.js` en dir `.ts`; nombre `003_register_rpc` vs archivo sigue preexistente. Solo build, sin prueba runtime. |
| 007 | 2026-06-24 | claude-code | escaner-realtime | ✅ Conforme | Polling→Realtime puro vía `subscribeScanEvents` en `scan.ts` (sin Supabase directo en page — verificado). `dev:stable` añadido. **Reparó import roto de `cf9d03c`.** Bugs nuevos: stale closure mayoreo (HIGH preexistente), errores silenciados (LOW). Solo build. |
| 008 | 2026-06-24 | codex | imagen-producto-stock-alert | ✅ Conforme | Upload de imagen en ProductoDialog (galería+cámara, JPG/PNG/WebP ≤2MB) vía `/api/storage/upload` (no Supabase directo); validación MIME server-side (verificado E2E, rechaza 415). Alerta de stock bajo post-venta. Bugs ya conocidos (npm audit). |
| 009 | 2026-06-24 | antigravity | top-productos-mayoreo | ✅ Conforme (con incidente) | Top 5 productos (`getTopProductos`, agregación en memoria) + mayoreo automático con badge. DB vía capa de datos (sin Supabase directo — verificado). **Su commit `cf9d03c` rompió el build del remoto** (import sin helper); reparado por #007. Mayoreo sin datos reales para probar. Mató proceso `next dev` fantasma del usuario. |

<!-- Última actualización: 2026-06-24 -->
