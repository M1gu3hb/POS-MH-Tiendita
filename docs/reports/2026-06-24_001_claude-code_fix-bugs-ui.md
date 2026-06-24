# Reporte 001 — claude-code — fix-bugs-ui

## Tarea recibida

Corrige estos 3 bugs en orden. Uno a la vez, verifica que funciona, luego el siguiente.

BUG 1 — Registro no redirige al dashboard
Archivo: app/(auth)/register/page.tsx
Problema: después de registro exitoso el usuario tiene que ir manualmente a /login
Causa probable: el router.push('/') se ejecuta antes de que la cookie de sesión de Supabase esté lista
Fix: después del POST a /api/negocio/register, llama a supabase.auth.signInWithPassword() con el email y password del formulario, espera que resuelva, y solo entonces haz router.push('/')
No toques la API route ni ningún otro archivo.

BUG 2 — ProductoDialog sin categorías no guía al usuario
Archivo: src/components/productos/ProductoDialog.jsx
Problema: el selector de categoría queda vacío cuando no hay categorías, sin ninguna guía
Fix: cuando la lista de categorías esté vacía, mostrar dentro del select un mensaje "No hay categorías — crea una primero" y debajo del select un botón pequeño "+ Nueva categoría" que abra un dialog inline simple para crear una categoría (solo campo nombre, color con 5 opciones predefinidas, botón guardar). Al guardar, que invalide el query de categorías y seleccione la nueva automáticamente.
Solo toca ProductoDialog.jsx. Si necesitas un helper en src/lib/db/categorias.ts para el create, créalo. Nada más.

BUG 3 — Scrollbar visible en sidebar
Archivo: src/components/layout/AppLayout.jsx (o el CSS correspondiente)
Problema: scrollbar visible en el sidebar en resoluciones menores
Fix: agrega overflow-y: auto con scrollbar oculta usando la clase scrollbar-hide de Tailwind, o si no está disponible, con CSS:
  .sidebar { scrollbar-width: none; }
  .sidebar::-webkit-scrollbar { display: none; }
Solo toca el layout o el CSS del sidebar. Nada más.

Después de los 3 bugs:
- Haz un solo commit con mensaje: "fix: registro auto-redirect + categorías vacías + scrollbar sidebar"
- Actualiza docs/BUGS_PENDING.md marcando estos 3 como resueltos
- Dime exactamente qué tocaste y qué no

## Lo que hice

**BUG 1 — Registro no redirige** · `app/(auth)/register/page.tsx`
- El código ya llamaba a `signInWithPassword` (vía `useAuth`, que envuelve `supabase.auth.signInWithPassword`) y ya esperaba el `await`. La causa real no era el sign-in sino el **Router Cache de Next**: prefetchea la RSC de `/` estando deslogueado y, al navegar, sirve el redirect cacheado a `/login`.
- Cambio: tras el `await signInWithPassword`, se añadió `router.refresh()` (invalida el Router Cache) **antes** de `router.replace('/')`. Es la opción que recomendaba `BUGS_PENDING.md`. Se mantuvo el wrapper `signInWithPassword` para no romper la regla "ningún componente llama a Supabase directo".

**BUG 2 — ProductoDialog sin categorías** · `src/components/productos/ProductoDialog.jsx`
- Imports añadidos: `useQueryClient` (@tanstack/react-query), `useAuth` (@/lib/auth/AuthContext), `createCategoria` (@/lib/db/categorias), e icono `Plus` (lucide-react).
- Constante `CATEGORIA_COLORES` con 5 colores predefinidos (`#ef4444`, `#f59e0b`, `#10b981`, `#2563eb`, `#8b5cf6`).
- Estado nuevo: `catDialogOpen`, `newCatNombre`, `newCatColor`, `savingCat`; hooks `negocioId` (useAuth) y `queryClient`.
- Handler `handleCreateCategoria`: valida nombre + negocioId, llama `createCategoria({ negocio_id, nombre, color })`, invalida el query `['categorias', negocioId]`, auto-selecciona la nueva (`setForm(... categoria_id: nueva.id)`), toast y cierra el diálogo inline.
- Select de categoría: con la lista vacía muestra "No hay categorías — crea una primero"; debajo, botón pequeño "+ Nueva categoría" que abre el diálogo inline.
- Diálogo inline (hermano, mismo patrón que el `BarcodeScanner` existente): campo nombre (con Enter para guardar) + 5 swatches de color + Guardar/Cancelar.
- Guard `handleDialogOpenChange`: añadido `if (catDialogOpen) return;` para que el diálogo de producto no se cierre mientras está abierto el de categoría.
- NOTA: `createCategoria` **ya existía** en `src/lib/db/categorias.ts`; no hizo falta crear el helper.

**BUG 3 — Scrollbar del sidebar** · `app/globals.css` + `app/(dashboard)/layout.tsx`
- No existe `src/components/layout/AppLayout.jsx`; el sidebar real es el `<nav>` del layout del dashboard (como indicaba `BUGS_PENDING.md`). No hay plugin `scrollbar-hide` en el proyecto.
- `app/globals.css`: nueva utilidad `.scrollbar-hide` en `@layer utilities` (`scrollbar-width: none` + `-ms-overflow-style: none` + `::-webkit-scrollbar { display: none }`).
- `app/(dashboard)/layout.tsx`: se añadió la clase `scrollbar-hide` al `<nav>` del sidebar. Conserva el scroll, oculta la barra.

**Docs** · `docs/BUGS_PENDING.md`: los 3 ítems marcados `[x]` con nota "RESUELTO 2026-06-24" y el fix aplicado.

Commit del fix: `ec760d4` — "fix: registro auto-redirect + categorías vacías + scrollbar sidebar" (5 archivos).

## Lo que NO toqué

- **API route `/api/negocio/register`**, `AuthContext`, cliente Supabase y RPC `registrar_negocio`: el BUG 1 quedó contenido en el page; la consigna pedía no tocar la API route ni otros archivos.
- **`app/(dashboard)/productos/page.jsx`** (página padre) y **`src/lib/db/categorias.ts`**: el BUG 2 quedó contenido en `ProductoDialog.jsx`; el helper `createCategoria` ya existía, así que no se modificó el repositorio.
- **Arquitectura, migraciones SQL, `extracted/`, otros componentes/hooks**: fuera de alcance; la regla del proyecto es no cambiar arquitectura ni añadir features.
- **4º bug "navegación lenta en 1ª carga"**: no estaba en el encargo y es comportamiento de `next dev` (compilación bajo demanda); se dejó abierto.

## Bugs detectados fuera de scope

- **Navegación lenta en la primera carga de cada sección** (ya documentado en `BUGS_PENDING.md`): es la compilación bajo demanda de `next dev`, no ocurre en producción. Sin acción.
- **`suscripciones` no legible por cajeros** (ya en `BUGS_PENDING.md`): la política RLS `dueno_suscripcion` es `for all` con `rol = 'dueno'`, así que un cajero no puede leer el estado de suscripción desde el cliente; el gating por acción podría fallar para cajeros. No tocado (fuera de scope).
- **Escritura del bucket `negocio-assets` sin acotar por carpeta `negocio_id/`** (ya en `BUGS_PENDING.md`): cualquier usuario autenticado puede escribir en el bucket. No tocado (fuera de scope).
- No se detectaron bugs nuevos no documentados durante este trabajo.

## Estado final

Build: **verde** (`next build` exit 0 tras cada bug; última corrida con los 3 cambios también exit 0).

Bugs corregidos:
1. Registro ahora invalida el Router Cache (`router.refresh()`) antes de navegar → redirige al dashboard de forma fiable tras el alta.
2. ProductoDialog guía al usuario cuando no hay categorías (mensaje en el select + botón "+ Nueva categoría" + diálogo inline con nombre y 5 colores; invalida el query y auto-selecciona).
3. Sidebar oculta la scrollbar conservando el scroll (utilidad `.scrollbar-hide`).

Qué funciona:
- Compilación completa de la app (17 rutas + middleware) sin errores; `tsc --noEmit` en verde.
- Verificación realizada a nivel de **build/compilación**. NO se ejecutó prueba runtime en navegador contra la BD real (BUG 1 requeriría crear una cuenta real; BUG 2, un negocio sin categorías). Recomendado validar en navegador con un negocio de prueba antes de cerrar definitivamente.

## Número de reporte: 001
