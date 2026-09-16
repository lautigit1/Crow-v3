# AUDITORÍA TÉCNICA PROFUNDA — Crow Repuestos v3
**Panel evaluador:** Staff SE Google · Principal Engineer Microsoft · Solutions Architect AWS · Senior Security Engineer · Senior DevOps Engineer · Engineering Manager · CTO inversor

---

## 1. RESUMEN EJECUTIVO

**¿Qué hace?**
Crow Repuestos es una plataforma web para una distribuidora de repuestos automotrices. Incluye un sitio público (landing + catálogo con filtros), área de cliente autenticada, y un panel de administración completo con CRUD de productos, marcas, categorías, proveedores, cotizaciones, usuarios, auditoría e inventario.

**¿Qué problema resuelve?**
Digitaliza una distribuidora automotriz: catálogo online navegable, sistema de cotizaciones, gestión de stock y trazabilidad de operaciones. Problema real y concreto.

**¿Qué tan complejo es?**
Complejidad media-alta para un proyecto individual. El stack es moderno, las capas están bien definidas, hay lógica de negocio no trivial (flujo de cotizaciones, roles, audit log, rate limiting).

**¿Qué tan completo está?**
Aproximadamente 80% funcional. Hay características declaradas en el README que están parcialmente incompletas (favoritos solo en localStorage, mis pedidos sin backend real, cero tests de frontend). El núcleo del backend está maduro.

**¿Está listo para producción?**
**No directamente.** Hay credenciales hardcodeadas en los Dockerfiles, ausencia de CI/CD, ningún test de frontend, y riesgos de seguridad documentados (state en memoria que se pierde al reiniciar). Con 2–3 semanas de trabajo puede alcanzar un estado production-ready para volúmenes bajos-medios.

---

## 2. NIVEL TÉCNICO

**Clasificación: Semi Senior avanzado / rozando Senior**

**Justificación:**

El desarrollador demuestra comprensión real de patrones no triviales:
- Unit of Work correcto (commit único por request, flush en CRUD)
- Token blocklist con TTL automático y documentación de trade-offs
- Refresh token rotation con replay prevention
- Audit log con SAVEPOINT para no contaminar la transacción principal
- GIN index con pg_trgm para búsqueda trigrama
- Feature-Sliced Design en el frontend

Lo que le falta para ser Senior pleno:
- Ausencia total de CI/CD
- node_modules en git
- Credenciales en docker-compose
- Cero tests de frontend
- Build de CI que no valida TypeScript

Un Senior no comete esos errores. Un Junior no implementa refresh token rotation con replay prevention ni SAVEPOINT para audit logs. Eso define el rango.

---

## 3. CALIDAD GENERAL

| Dimensión | Nota | Justificación |
|---|---|---|
| Arquitectura | 7.5/10 | Capas bien definidas, UoW, CRUDBase genérico. Sin repositorio hexagonal completo. |
| Organización | 7/10 | FSD en frontend bien aplicado. Backend ordenado. node_modules y pycache en repo rompen la estructura. |
| Legibilidad | 8/10 | Código comentado y bien nombrado. Docstrings útiles. Inline styles en frontend dificultan la lectura de JSX largo. |
| Mantenibilidad | 7/10 | Fácil agregar entidades nuevas. Sin CI ni tests de frontend, los cambios son riesgosos. |
| Escalabilidad | 5/10 | State en memoria (rate limiter, blocklist) impide escalar horizontalmente sin Redis. |
| Seguridad | 7/10 | HttpOnly cookies, bcrypt, headers, CSRF implícito (SameSite=lax). Credenciales en docker-compose y spoofing de IP sin validar proxy. |
| Performance | 6.5/10 | Cache-Control en endpoints públicos, pg_trgm. Sin lazy loading en React ni compresión de imágenes. |
| Calidad del código | 7.5/10 | Genéricos, tipos correctos, TypeScript strict. Algunos code smells (dict comprehension en suppliers.py, confirm() en UI). |
| Diseño visual | 8/10 | Paleta corporativa consistente, sistema de tokens, admin profesional. Sin Tailwind: CSS inline verboso. |
| Backend | 8/10 | FastAPI bien usado, dependencias inyectadas, DTOs completos, manejo de errores uniforme. |
| Frontend | 6.5/10 | FSD bien aplicado, interceptor de axios sofisticado. Sin tests, sin lazy loading, sin error boundaries. |
| UX | 7/10 | Skeleton loaders, filtros activos con chips, debounce en búsqueda, feedback visual correcto. |
| UI | 7.5/10 | Diseño cohesivo y profesional. Accesibilidad no verificada (faltan aria-labels en varios lugares). |
| Documentación | 8/10 | README excelente con diagrama de arquitectura, tablas de cuentas, instrucciones claras. Falta documentación de API más allá de Swagger. |
| DevOps | 4/10 | Docker Compose funcional. Sin CI/CD, sin monitoring, sin staging, sin secretos externos. |
| Testing | 3/10 | Tests de backend útiles pero sin cobertura de todos los módulos. Frontend: 0 tests. E2E: 0. |
| Base de datos | 7.5/10 | Migraciones Alembic, índices, soft delete, pg_trgm. Sin composite indexes, analytics con N queries. |
| Deployment | 4/10 | Un comando levanta todo. Sin HTTPS, sin variables de entorno externas en producción, sin health checks en Compose más que para db. |

---

## 4. ARQUITECTURA

### Patrones detectados y evaluación

**Unit of Work — ✅ Bien implementado**
`database.py` implementa UoW correctamente: la sesión hace `yield db`, commit único al terminar, rollback automático en excepción. Ningún controlador llama `commit()` directamente. Los CRUD usan `flush()` para obtener PKs sin confirmar. Esto es textbook UoW.

**Generic Repository (CRUDBase) — ✅ Bien implementado**
`CRUDBase[Model, Create, Update]` con TypeVars y soporte de soft delete. Correcto uso de genéricos Python. El patrón Repository se instancia de forma simple en `crud.py`.

**Layered Architecture — ✅ Implementado**
`routes → crud → models` con schemas como DTOs. La separación es consistente. Los controladores no tienen lógica de negocio compleja.

**Feature-Sliced Design (frontend) — ✅ Bien aplicado**
`app / pages / widgets / features / entities / shared` con reglas de importación respetadas. Cada slice expone su API tipada. Correcto para el tamaño del proyecto.

**Dependency Injection — ✅ FastAPI Depends**
`CurrentUser`, `AdminUser`, `DbSession` como tipos anotados. Correcto y testeable (el conftest lo muestra).

**Soft Delete — ✅ Implementado**
`is_deleted` en productos, categorías y marcas. Migraciones Alembic con índices. El `CRUDBase` aplica el filtro automáticamente.

**Observer / Background Tasks — ✅ Presente**
Emails enviados como `BackgroundTasks` de FastAPI. No bloquea el ciclo request/response.

**CQRS — ❌ No implementado** (no requerido a este nivel)
**DDD / Hexagonal — ❌ No implementado** (tampoco necesario para el scope)
**Microservicios — ❌ Monolito** (decisión correcta para el tamaño actual)

### Evaluación de cohesión/acoplamiento

Los módulos están bien cohesionados. El acoplamiento entre capas es correcto (routes dependen de crud y models, no al revés). El punto de mejora: `audit.record_standalone()` crea su propia sesión rompiendo levemente el UoW, aunque está justificado para eventos de error.

---

## 5. CÓDIGO

### Fortalezas del código

- **Tipado completo**: TypeScript strict en frontend, type hints en todo el backend Python.
- **Nombres claros**: `get_user_from_refresh_token`, `validate_password_strength`, `_sweep_unlocked`. Sin abreviaciones crípticas.
- **Comentarios de valor**: Los docstrings explican *por qué*, no solo *qué*. El `token_blocklist.py` documenta los trade-offs vs Redis. El `database.py` explica el patrón UoW. Esto es Senior-level documentation.
- **Sin números mágicos sueltos**: `_MIN_LENGTH = 10`, `LOW_STOCK_THRESHOLD = 5`, `_BCRYPT_MAX_BYTES = 72`.
- **Guard clauses**: El código evita anidamiento innecesario.

### Problemas detectados

**Code smell — suppliers.py `_to_read()`:**
```python
# Línea actual — frágil y bypasea validación Pydantic
{c.name: getattr(s, c.name) for c in s.__table__.columns}
# Correcto sería:
SupplierRead.model_validate(s, from_attributes=True)
```
Impacto: Si se agrega un campo a `SupplierRead` que no está en la tabla, falla en runtime sin error claro. Prioridad: Media.

**Bug lógico — register limiter:**
```python
# En auth.py línea ~80
_register_limiter.register_failure(ip, ip or "anon")  # ← usa IP como email
# Además se llama incluso en registro EXITOSO
```
El rate limiter de registro penaliza registros exitosos y usa la IP como clave de "email", rompiendo la lógica de bloqueo por combinación IP+email. Prioridad: Alta.

**`confirm()` nativo en el admin:**
```typescript
if (!confirm(`¿Eliminar "${p.name}"?`)) return;
```
Bloquea el hilo principal, no es styleable, deprecated en contextos modernos. Reemplazar con modal de confirmación. Prioridad: Media.

**Inline styles masivos en JSX:**
`AdminProductsPage.tsx` tiene 300+ líneas con objetos de estilo inline. Dificulta la lectura, impide reutilizar CSS, no permite critical path extraction. Prioridad: Media.

**`import time as _time` dentro de función:**
En `auth.py / reset_password` hay un import dentro de la función. Mover al top-level. Prioridad: Baja.

**`node_modules` en repositorio:**
El listado de archivos muestra `frontend/node_modules/` trackeado en git. Esto infla el repo, mezcla dependencias de terceros con código propio y puede ocultar vulnerabilidades actualizadas. Prioridad: **Crítica**.

---

## 6. BACKEND

### Endpoints — Evaluación

| Módulo | Endpoints | Validación | DTOs | Auth | Paginación | Audit |
|---|---|---|---|---|---|---|
| auth | register/login/logout/refresh/me/forgot/reset | ✅ | ✅ | Correcto | N/A | ✅ |
| products | list/get/create/update/delete | ✅ | ✅ | Admin para mutaciones | ✅ (skip/limit) | ✅ |
| categories | CRUD | ✅ | ✅ | Admin | ✅ | ✅ |
| brands | CRUD | ✅ | ✅ | Admin | ✅ | ✅ |
| quotes | create(public)/me/list(admin)/status | ✅ | ✅ | Mixto | ✅ | ✅ |
| users | me/update/password/admin-list/admin-update/delete | ✅ | ✅ | Correcto | ✅ | ✅ |
| suppliers | CRUD | ✅ | ✅ | Admin | ✅ | ✅ |
| dashboard | stats/analytics | ✅ | ✅ | Admin | N/A | ✗ |
| audit | list | ✅ | ✅ | Admin | ✅ | N/A |
| settings | (presente) | N/V | N/V | N/V | N/V | N/V |

### Autenticación — Análisis profundo

**Bien hecho:**
- HttpOnly cookies con `SameSite=lax` — JavaScript no puede leer los tokens
- Refresh token rotation con JTI blocklist (replay prevention funcional y testeado)
- `type` claim en el payload para prevenir cross-token usage
- Token revocación via JTI al hacer logout
- Password reset one-time use (JTI blocklisted tras uso)
- `secure=True` en producción automáticamente
- Enumeración de usuarios prevenida en `/forgot-password` (siempre 204)

**Problemas:**
- `_REFRESH_SECRET = settings.SECRET_KEY + ":refresh"` — derivación por concatenación simple. HKDF sería más robusto si el secret principal fuera comprometido.
- Access token tiene TTL de 1440 minutos (24h) en el docker-compose.yml raíz, pero 30 min en el docker-compose del backend. Inconsistencia crítica: si se usa el Compose raíz para producción, los tokens duran 24h sin posibilidad de revocación eficiente (el in-memory blocklist es el único mecanismo).
- No hay `iss` (issuer) ni `aud` (audience) en el JWT — recomendado por RFC 7519.

### Rate Limiting

Bien estructurado con ventana deslizante. La documentación de la limitación (single-instance) es honesta y correcta. El problema de la pérdida al reiniciar está documentado.

**Problema:** El rate limiter usa `threading.Lock` con diccionarios en memoria. En carga alta con uvicorn multi-worker, cada worker tiene su propio rate limiter independiente, reduciendo la efectividad a 1/N_WORKERS. Documentado como limitación pero no es obvio para el deployer.

### Consultas N+1 — Evaluación

**Bien resuelto en products.py:**
```python
_EAGER = [selectinload(Product.category), selectinload(Product.brand), selectinload(Product.supplier)]
```
`selectinload` genera 3 queries adicionales independientemente del número de productos (N=1). Correcto.

**Problema potencial en dashboard:**
8+ queries independientes para stats. No es N+1 pero es ineficiente. En producción con datos reales, un único CTE o query combinado sería más performante.

**Problema en suppliers.py:**
`_to_read()` hace una query por supplier para contar productos. En la ruta de listado, esto se resolvió con batch query — bien. Pero `get_supplier()` llama `_to_read()` que hace una query extra. Menor.

### Analytics — Problema de soft delete

```python
# dashboard.py — analytics
# Cuenta TODOS los productos incluyendo los eliminados
total_products = db.scalar(select(func.count()).select_from(Product)) or 0
```
Los contadores del dashboard incluyen productos con `is_deleted=True`. El número que ve el admin no refleja la realidad. Prioridad: Alta.

---

## 7. FRONTEND

### Arquitectura

Feature-Sliced Design bien aplicado. Las capas respetan las reglas de importación (`pages` → `widgets` → `features` → `entities` → `shared`). Los tipos están en `entities/*/model.ts`, las API calls en `entities/*/api.ts` y en `entities/*/index.ts`. Correcto.

### Estado y Hooks

`AuthProvider` con Context + `useCallback` + `useMemo` — bien optimizado. El interceptor de axios con queue de subscribers para evitar múltiples refreshes concurrentes es código de nivel Senior.

```typescript
// client.ts — sofisticado manejo de refresh concurrente
let isRefreshing = false;
let refreshSubscribers: Array<(ok: boolean) => void> = [];
```
Esto previene race conditions cuando múltiples requests fallan con 401 simultáneamente. Poco común ver esto bien implementado.

### Problemas del Frontend

**Sin lazy loading de rutas — Prioridad: Alta**
```typescript
// App.tsx — todos los imports son estáticos
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";
import { AdminInventoryPage } from "@/pages/admin/AdminInventoryPage";
// ... 15+ imports más
```
Todo el código admin se descarga en el primer visit del sitio público. Usar `React.lazy` + `Suspense` reduciría el bundle inicial ~40%.

**Sin Error Boundaries — Prioridad: Alta**
Un error en cualquier componente derrumba toda la aplicación. Implementar al menos uno en `App.tsx`.

**Inline styles como único sistema — Prioridad: Media**
La totalidad del styling es inline. `AdminProductsPage.tsx` tiene objetos de estilo definidos inline en cada `render()`, lo que:
- Crea nuevos objetos en cada re-render (aunque React los memoriza bien, no es óptimo)
- Hace el JSX difícil de leer (componentes de 400+ líneas)
- Impide reutilización a nivel CSS
- Imposibilita critical path CSS
Alternativa: CSS Modules o Tailwind (ya tiene Vite configurado para soportarlo).

**`useEffect` con dependencias comentadas — Prioridad: Media**
```typescript
// AdminProductsPage.tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [q, categoryId, brandId, supplierId, stockOnly, sort, page]);
```
El comentario sugiere que `reload` fue intencionalmente excluido para evitar loops, pero indica que la función no está correctamente memoizada. Reescribir con `useCallback`.

**`handleMouseEnter/Leave` en la tabla — Prioridad: Baja**
```typescript
onMouseEnter={(e) => onRowClick && (e.currentTarget.style.background = color.surface)}
```
Mutar `style` directamente en el DOM desde React es un antipatrón. Usar estado local o CSS hover.

**Favoritos en localStorage — Limitación funcional**
Los favoritos del usuario no están en el backend. Se pierden al cambiar de dispositivo/navegador y no sobreviven a limpiar el storage. El `FavoritesPage` muestra productos que podrían haber sido eliminados.

**Sin validación client-side de formularios robusta**
Los forms usan `required` HTML5 pero sin validación real. Errores solo se muestran post-submit (viaje al servidor). React Hook Form + Zod elevaría significativamente la UX.

---

## 8. BASE DE DATOS

### Modelo

Bien normalizado. Las relaciones son correctas:
- Product → Category (FK nullable, ondelete=SET NULL) ✅
- Product → Brand (FK nullable, ondelete=SET NULL) ✅
- Product → Supplier (FK nullable, ondelete=SET NULL) ✅
- Quote → User (FK nullable) ✅
- Quote → Product (FK nullable) ✅

### Índices existentes

- `users.email` (unique + index) ✅
- `products.name` (index) ✅
- `products.sku` (unique + index) ✅
- `products.is_deleted` (index, migration 002) ✅
- `products.name`, `sku`, `description` GIN trgm (migration 003) ✅

### Índices faltantes

```sql
-- Falta índice compuesto para el filtro más común en catálogo:
CREATE INDEX ix_products_category_stock ON products(category_id, stock) WHERE is_deleted = FALSE;
-- Falta para cotizaciones por usuario:
CREATE INDEX ix_quotes_user_id ON quotes(user_id);
-- Falta para auditoría por fecha:
CREATE INDEX ix_audit_logs_created_at ON audit_logs(created_at DESC);
```

### Constraints faltantes

- No hay `CHECK` constraint en `products.stock >= 0`
- No hay `CHECK` constraint en `products.price > 0`
- Supplier sin unique constraint en `name` — puede haber proveedores duplicados
- Quote.message sin longitud mínima a nivel base de datos

### Migraciones

Las 3 migraciones están bien escritas con `upgrade()` y `downgrade()`. La 003 (pg_trgm) es especialmente sofisticada — indica conocimiento real de optimización de Postgres.

---

## 9. SEGURIDAD

### OWASP Top 10 — Evaluación

| Categoría | Estado | Detalle |
|---|---|---|
| A01 Broken Access Control | ✅ Protegido | `RequireAuth`, `RequireAdmin`, `AdminUser` dependency correctos |
| A02 Cryptographic Failures | ⚠️ Parcial | bcrypt correcto. SECRET_KEY hardcodeado en Compose. |
| A03 Injection (SQL) | ✅ Protegido | SQLAlchemy con parámetros. No hay SQL raw. |
| A04 Insecure Design | ⚠️ Parcial | Rate limiting in-memory. Replay prevention correcto. |
| A05 Security Misconfiguration | ❌ Problema | node_modules en repo. Secrets en Compose. |
| A06 Vulnerable Components | ❌ No verificable | Sin Dependabot/Snyk. node_modules en repo complica auditoría. |
| A07 Auth Failures | ✅ Protegido | Refresh rotation, blocklist, rate limit |
| A08 Data Integrity Failures | ✅ Protegido | SAVEPOINT en audit, UoW |
| A09 Logging Failures | ✅ Protegido | JSON logging estructurado, audit log inmutable |
| A10 SSRF | N/A | No hay peticiones a URLs externas desde el server |

### Vulnerabilidades específicas

**CRÍTICA — Credenciales hardcodeadas en Compose:**
```yaml
# docker-compose.yml (raíz)
SECRET_KEY: change-me-in-production-please
SEED_ADMIN_PASSWORD: admin1234
```
Si alguien hace `docker compose up` sin sobrescribir variables de entorno, el sistema arranca con una clave pública conocida. Cualquier token JWT generado puede ser falsificado.

**ALTA — Spoofing de IP via X-Forwarded-For:**
```python
# audit.py
fwd = request.headers.get("x-forwarded-for")
if fwd:
    return fwd.split(",")[0].strip()
```
Cualquier cliente puede poner `X-Forwarded-For: 127.0.0.1` y evadir el rate limiter (que usa IP como clave). En la configuración Docker actual (nginx hace de proxy), el X-Forwarded-For sí viene de nginx, pero hay que validar que solo se confíe en proxies conocidos. Solución: usar `uvicorn --forwarded-allow-ips=nginx_container_ip` o validar el header solo si la request viene de una IP confiable.

**ALTA — Inconsistencia de TTL entre Compose files:**
```yaml
# docker-compose.yml (raíz — el que se usa con "docker compose up")
ACCESS_TOKEN_EXPIRE_MINUTES: "1440"  # 24 HORAS

# backend/docker-compose.yml
ACCESS_TOKEN_EXPIRE_MINUTES: "30"    # 30 minutos
```
Un administrador que sigue el README hace `docker compose up` desde la raíz y obtiene tokens de 24 horas. Al hacer logout, el token queda en el blocklist in-memory. Si el servicio se reinicia, ese token vuelve a ser válido por hasta 24 horas.

**MEDIA — X-Forwarded-For trivialmente spoofeable como bypass de rate limit:**
Un atacante puede rotar la IP de la cabecera para bypassear el rate limiter de login.

**BAJA — SMTP credentials en logs:**
Si `send_email()` falla, el error logeado incluye el destinatario pero no las credenciales. Correcto. Sin embargo, si `SMTP_PASSWORD` fuera logueado accidentalmente en un mensaje de error customizado en el futuro, sería un problema. Los secrets deberían estar en `settings` y no circular como strings.

**BAJA — CORS permite localhost en producción:**
`BACKEND_CORS_ORIGINS` por defecto incluye `http://localhost:5173`. Si `ENVIRONMENT` no se setea a `production`, CORS queda permisivo.

### Lo que está bien en seguridad (y es poco común)

1. **HttpOnly + SameSite=lax** para tokens: JavaScript no puede robar los tokens. XSS no compromete la autenticación.
2. **Refresh token con scope restringido**: `path="/api/auth/refresh"` — el refresh token solo se envía a ese endpoint.
3. **Token type validation**: `payload.get("type") != "access"` previene usar refresh tokens como access tokens.
4. **JTI único por token**: Permite revocación granular sin invalidar todos los tokens del usuario.
5. **Refresh replay prevention**: Testeado y funcional.
6. **Password reset one-time use**: El JTI del reset token se bloquea inmediatamente tras uso.
7. **User enumeration prevention**: `/forgot-password` siempre responde 204.
8. **Bcrypt truncation guard**: El límite de 72 bytes está documentado y manejado.
9. **Docs deshabilitados en producción**: `/docs`, `/redoc`, `/openapi.json` solo en dev.
10. **CSP estricta en la API**: `default-src 'none'` para una API JSON es correcto.

---

## 10. PERFORMANCE

### Backend

**Bien:**
- `Cache-Control: public, max-age=60` en listado de productos ✅
- `stale-while-revalidate=30` para CDN ✅
- `selectinload` (no `lazy`, no `joinedload`) para relations ✅
- `pool_pre_ping=True` para detectar conexiones muertas ✅
- `DB_POOL_RECYCLE=1800` para evitar TCP stale ✅

**Problemas:**
- Dashboard hace 8 queries separadas en una sola petición. Sin cache.
- `count_stmt` en products usa subquery: `select(func.count()).select_from(stmt.order_by(None).subquery())`. Funcional pero menos eficiente que `COUNT(*) OVER()` con window functions.
- Analytics de dashboard incluye soft-deleted products (ya mencionado).

### Frontend

**Bien:**
- Debounce de 200ms en búsqueda para evitar spam de requests ✅
- Skeleton loaders durante carga ✅
- `shimmer` animation via CSS para skeleton ✅

**Problemas:**
- Sin code splitting — todo el bundle se descarga en el primer visit ❌
- Sin React.lazy — el código del admin panel se envía a usuarios públicos ❌
- Sin virtualización para listas largas (si hay 1000 productos, todos se renderizan) ❌
- Fonts externas (Unbounded, DM Sans, Fira Mono) — si no están en el Dockerfile, se descargan de Google Fonts bloqueando el render ❌
- `shimmer` animation se define como `<style>` inline en cada `SkeletonCard` render — múltiples `<style>` tags idénticos en el DOM ❌

### Nginx

**Bien:**
- Gzip habilitado ✅
- Assets hashed con `max-age=2592000, immutable` ✅
- SPA fallback correcto ✅
- Proxy headers correctos (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`) ✅

**Faltas:**
- Sin rate limiting a nivel nginx
- Sin `client_max_body_size` configurado
- Sin `proxy_read_timeout` configurado (default 60s puede ser corto para operaciones lentas)

---

## 11. DEVOPS

### Docker — Evaluación

**docker-compose.yml (raíz) — Bien:**
- `depends_on` con `condition: service_healthy` para db ✅
- `restart: unless-stopped` ✅
- Healthcheck en postgres ✅
- Un solo `docker compose up` levanta todo ✅

**Problemas:**
- Credentials hardcodeadas en environment (ya mencionado)
- Sin `.env` file obligatorio — no hay validación de que las variables de producción estén seteadas
- `backend/docker-compose.yml` tiene `volumes: - ./:/app` — monta el source code en el contenedor de producción. Si el proceso se compromete, puede modificar archivos fuente. Nunca montar código fuente en producción.

**Dockerfile backend:**
```dockerfile
# Bien: slim image, no-cache pip
FROM python:3.12-slim
RUN pip install --no-cache-dir -r requirements.txt
```
Sin vulnerabilidades obvias. Falta: usuario no-root, multi-stage build para reducir imagen.

**Dockerfile frontend:**
Multi-stage build correcto (node para build, nginx para serve). Sin problemas. ✅

### CI/CD — Ausente

**No existe ningún pipeline de CI/CD.** No hay:
- GitHub Actions
- Pre-commit hooks
- Lint automatizado
- Tests automatizados en push
- Build automatizado
- Deploy automatizado

Esto significa que cada cambio que se pushea al repositorio no tiene validación automática. Un developer (o el mismo autor) puede romper el backend sin saberlo.

### Monitoring — Ausente

No hay:
- Prometheus / Grafana
- Sentry (error tracking)
- Uptime monitoring
- Alertas de stock bajo o errores 5xx
- Dashboards de infraestructura

El logging estructurado JSON está preparado para ingesta por Datadog/Loki, pero no hay configuración de ningún agregador.

---

## 12. TESTING

### Backend Tests — Evaluación

**Fortalezas:**
- `conftest.py` bien diseñado: SQLite in-memory, rollback per-test (isolation real) ✅
- `dependency_overrides` para inyectar la sesión de test ✅
- Fixtures compuestos (product fixture depende de category + brand) ✅
- `test_auth.py` cubre flujos complejos: refresh rotation, replay prevention, reset token reutilización ✅
- `test_products.py` cubre soft delete, filtros, cache headers ✅

**Problemas:**
- Sin tests para: categories, brands, suppliers, users, dashboard, quotes, audit, settings
- Sin test de concurrencia del rate limiter
- Sin test de los middleware (SecurityHeaders, RequestID, RequestLogging)
- Sin test del email service
- Cobertura estimada: ~25-30% del backend

### Frontend Tests — Ausentes

Cero tests de frontend. No hay:
- Unit tests (Vitest/Jest)
- Component tests (Testing Library)
- E2E tests (Playwright/Cypress)

Para un proyecto con lógica de negocio en el cliente (AuthProvider, interceptor de refresh, filtros del catálogo), la ausencia de tests es un riesgo mayor.

---

## 13. GIT

### Historial

Solo 3 commits en `master`, sin branches:

```
3668e81 2026-06-26 "Subo creacion de tests"
75eb473 2026-06-24 "Subo modificaciones varias"
0eae9c3 2026-06-23 "Subo proyecto completo"
```

**Problemas:**
- Mensajes en español informal, sin convención (Conventional Commits, Angular, etc.)
- "Subo proyecto completo" como primer commit — todo el proyecto en un solo commit imposibilita ver la evolución
- Solo `master`, sin ramas de feature, desarrollo o hotfix
- Sin tags de versión
- `node_modules/` y `__pycache__/` en el repositorio
- Sin `.gitignore` efectivo para los archivos mencionados (o el .gitignore no estaba antes del primer commit)

**Lo positivo:** El proyecto tiene git. Hay historial. El proyecto no fue enviado como un ZIP.

---

## 14. DOCUMENTACIÓN

### README — Excelente para el nivel del proyecto

El README es genuinamente bueno:
- Diagrama ASCII de arquitectura (`navegador → nginx → FastAPI → Postgres`)
- Tabla de cuentas demo con roles
- Sección de "Arranque rápido" con un solo comando
- Explicación de FSD en el frontend
- Descripción de seguridad implementada
- Instrucciones de desarrollo sin Docker

Esto está por encima de lo que hacen la mayoría de Junior y Semi-senior developers.

**Faltas:**
- No documenta cómo configurar variables de entorno para producción
- No documenta el proceso de deploy real (más allá de docker compose)
- No tiene CHANGELOG

### Documentación de código

Docstrings descriptivos en módulos clave (`database.py`, `token_blocklist.py`, `logging_config.py`). Los comentarios explican decisiones de diseño, no solo acciones.

### Documentación de API

Swagger disponible en dev en `/docs`. Sin Auth configurado para HttpOnly cookies (no se puede autenticar desde Swagger UI), lo que limita su utilidad como herramienta de exploración.

---

## 15. ESCALABILIDAD

| Escenario | ¿Soporta? | Limitante principal |
|---|---|---|
| 100 usuarios | ✅ Sí | Ninguna |
| 1.000 usuarios | ✅ Sí | Pool de 5+10 conexiones adecuado |
| 10.000 usuarios | ⚠️ Con esfuerzo | Rate limiter in-memory pierde efectividad. Blocklist in-memory se llena. |
| 100.000 usuarios | ❌ No sin cambios | State en memoria no escala. Un solo proceso uvicorn. Sin CDN. |
| 1.000.000 usuarios | ❌ No | Requiere arquitectura completamente diferente |

**Para escalar a 10k-100k:**
1. Redis para token blocklist y rate limiters
2. Uvicorn con múltiples workers (`--workers 4`)
3. CDN (Cloudflare) frente a nginx para assets estáticos
4. Read replicas para queries de lectura
5. Cache de queries frecuentes (Redis o Memcached)
6. Lazy loading + code splitting en frontend

---

## 16. MANTENIBILIDAD

| Cambio | Dificultad | Estimación |
|---|---|---|
| Agregar nueva entidad (ej: pedidos) | Baja | 1-2 días — CRUDBase + schema + routes |
| Cambiar base de datos a MySQL | Media | 2-3 días — migrar dialecto, perder pg_trgm |
| Cambiar frontend a Next.js | Alta | 2-3 semanas |
| Cambiar autenticación a OAuth2 externo | Media | 1 semana |
| Escalar el equipo (onboarding dev nuevo) | Media | El README ayuda. Sin CONTRIBUTING.md. Sin linting forzado. |

---

## 17. COMPARACIÓN PROFESIONAL

**vs. Estudiante:** Estudiante no implementa UoW, no tiene refresh token rotation, no usa genéricos en Python, no conoce FSD. Este proyecto está muy por encima.

**vs. Bootcamp:** Bootcamp típico hace un CRUD con JWT Bearer sin HttpOnly cookies, sin soft delete, sin audit log, con SQL injection posible. Este proyecto los supera ampliamente.

**vs. Junior:** Un Junior típico haría la autenticación bien o la arquitectura bien, no ambas. Este proyecto supera el nivel Junior claramente.

**vs. Semi Senior:** Comparable. Un Semi Senior estable normalmente tendría CI/CD, más tests y gitflow. El código de seguridad de este proyecto supera el promedio del nivel.

**vs. Senior:** Un Senior no commitea node_modules, tiene CI/CD desde el día uno, y no tiene credenciales hardcodeadas en Compose. Esos errores no operacionales definen la diferencia.

**vs. Tech Lead:** Un Tech Lead definiría ADRs, múltiples environments, runbooks, alertas. No comparable todavía.

**vs. Open source popular (FastAPI, Tiangolo templates):** Comparte muchas prácticas del full-stack-fastapi-template oficial. El nivel de seguridad (refresh rotation, HttpOnly, audit log) lo pone por encima de muchos proyectos open source populares de mediano tamaño.

---

## 18. FORTALEZAS (ordenadas por impacto)

1. **Sistema de autenticación de producción**: HttpOnly cookies, refresh rotation con replay prevention, JTI blocklist, token revocation, user enumeration prevention. Nivel que no se ve en el 80% de proyectos personales Senior.

2. **Unit of Work correctamente implementado**: Commit único por request, flush en CRUD, rollback automático. Esto previene datos parcialmente escritos.

3. **Audit log con SAVEPOINT**: Un fallo en el log de auditoría no rompe la operación principal. Código defensivo de nivel profesional.

4. **README genuinamente útil**: Diagrama, instrucciones, cuentas demo, arquitectura. Ahorra horas a cualquiera que quiera evaluar o usar el proyecto.

5. **CRUDBase genérico con soft delete**: Eliminar y agregar entidades es rápido y consistente. La reutilización de código es real.

6. **Structured JSON logging**: Listo para ingesta por Datadog, Loki, CloudWatch sin configuración adicional.

7. **pg_trgm con GIN index**: Búsqueda trigrama correctamente configurada con migración Alembic. Pocos developers de este nivel saben que esto existe.

8. **Interceptor axios con refresh concurrente**: Previene race conditions cuando múltiples requests fallan con 401 simultáneamente. Código no trivial bien implementado.

9. **Middleware stack completo**: SecurityHeaders (CSP, HSTS, X-Frame-Options, Permissions-Policy), RequestID, RequestLogging en orden correcto.

10. **Tests de backend con rollback isolation**: Cada test tiene estado limpio sin truncar tablas. La fixture composition (product → category + brand) es elegante.

11. **TypeScript strict mode**: `noUnusedLocals`, `noUnusedParameters`, `strict: true`. Sin escape hatches.

12. **Feature-Sliced Design aplicado correctamente**: Las reglas de importación entre slices se respetan. El código nuevo sabe dónde ir.

13. **Validación de password robusta**: 10 chars mínimo, mayúsculas, minúsculas, dígito, especial, blocklist de contraseñas comunes. Por encima del estándar.

14. **Nginx multi-stage Docker + gzip + immutable cache**: Deployment correcto para producción de un SPA.

15. **Bcrypt con truncación documentada**: El límite de 72 bytes de bcrypt está manejado y comentado. Detalle de seguridad que pocos conocen.

---

## 19. DEBILIDADES (ordenadas por impacto)

### CRÍTICAS

**[C1] node_modules en repositorio git**
- Evidencia: `frontend/node_modules/` listado en el árbol de archivos
- Impacto: Repo con tamaño enorme, mezcla de código con dependencias, auditoría de seguridad imposible, dependencias no actualizables via `npm install`
- Solución: Agregar `/node_modules` al `.gitignore` y purgar el historial con `git filter-repo` o `BFG Repo Cleaner`
- Complejidad: Baja

**[C2] SECRET_KEY hardcodeado en docker-compose.yml**
- Evidencia: `SECRET_KEY: change-me-in-production-please` en ambos Compose files
- Impacto: Si se deploya con este Compose, todos los JWT son falsificables. Compromiso total de autenticación.
- Solución: Usar `${SECRET_KEY}` y requerir variable de entorno. Añadir validación en startup que falle si `SECRET_KEY == "change-me-in-production-please"`.
- Complejidad: Baja

**[C3] Dashboard no filtra productos eliminados**
- Evidencia: `dashboard.py` — `select(func.count()).select_from(Product)` sin filtro `is_deleted`
- Impacto: El admin ve números incorrectos. Métricas de negocio incorrectas.
- Solución: `.where(Product.is_deleted.is_(False))` en todas las queries de analytics
- Complejidad: Baja

### ALTAS

**[A1] Cero CI/CD**
- Impacto: Cualquier push puede romper producción sin detección. No hay gating de calidad.
- Solución: GitHub Actions con lint + tests en cada push
- Complejidad: Baja (~2-4 horas)

**[A2] `build:ci` omite TypeScript**
- Evidencia: `"build:ci": "vite build"` (sin `tsc`)
- Impacto: Errores de TypeScript no detectados en CI. La imagen Docker puede contener código con errores de tipos.
- Solución: `"build:ci": "tsc --noEmit && vite build"` o agregar `tsc` como paso separado en CI
- Complejidad: Trivial

**[A3] Access token TTL inconsistente**
- Evidencia: 1440 min en Compose raíz vs 30 min en backend Compose
- Impacto: En producción con Compose raíz, tokens de 24h que no pueden ser efectivamente revocados si el service reinicia
- Solución: Definir un único source of truth. Recomendar 15-30 min para access token.
- Complejidad: Trivial

**[A4] Bug en register limiter**
- Evidencia: `_register_limiter.register_failure(ip, ip or "anon")` con clave incorrecta y llamada en éxito
- Impacto: Rate limiting de registro disfuncional. Penaliza registros exitosos.
- Solución: Usar `(ip, data.email)` como clave y llamar solo en intentos abusivos detectados
- Complejidad: Baja

**[A5] IP spoofing del rate limiter via X-Forwarded-For**
- Impacto: Un atacante puede rotar la cabecera para evadir rate limiting de login
- Solución: Configurar trusted proxies en uvicorn/fastapi y solo confiar en X-Forwarded-For cuando viene de una IP de proxy conocida
- Complejidad: Baja

**[A6] Sin lazy loading en React**
- Impacto: Bundle inicial incluye código admin (~40% del total). Tiempo de carga mayor para usuarios públicos.
- Solución: `React.lazy` + `Suspense` en App.tsx para rutas admin
- Complejidad: Baja (2-3 horas)

**[A7] Sin Error Boundaries**
- Impacto: Un error en cualquier componente derrumba la app completa
- Solución: Envolver `<App>` en un ErrorBoundary con UI de fallback
- Complejidad: Baja (1 hora)

**[A8] Cero tests de frontend**
- Impacto: Refactoring peligroso. Regresiones no detectadas.
- Solución: Vitest + Testing Library para componentes críticos (AuthProvider, guards, catálogo)
- Complejidad: Media (1-2 semanas)

### MEDIAS

**[M1] `_to_read()` en suppliers.py usa dict comprehension frágil**
- Solución: `SupplierRead.model_validate(s, from_attributes=True)`

**[M2] `backend/docker-compose.yml` monta source code en producción**
- Evidencia: `volumes: - ./:/app`
- Solución: Eliminar ese volume en producción. Solo usar en desarrollo.

**[M3] `confirm()` nativo en deletes del admin**
- Solución: Modal de confirmación con componente reutilizable

**[M4] Analytics sin cache**
- Impacto: Cada visita al dashboard hace 8+ queries
- Solución: Cache de 60s en respuesta o precómputo periódico

**[M5] Cobertura de tests backend ~25-30%**
- Faltan: categories, brands, suppliers, users, dashboard, audit, settings

**[M6] Shimmer animation definida en cada render de SkeletonCard**
- Solución: Mover `<style>` al CSS global o `index.css`

**[M7] Favoritos sin persistencia server-side**
- Los favoritos se pierden al cambiar dispositivo/browser

**[M8] `my_quotes` sin paginación**
- Un usuario con muchas cotizaciones carga todas de una vez

**[M9] Email templates como strings Python**
- Difícil de mantener. Usar Jinja2 templates.

### BAJAS

- `__pycache__/` y `.pytest_cache/` en git
- `import time as _time` dentro de función en auth.py
- Sin tags de versión en git
- Sin `CHECK` constraints en DB (stock >= 0, price > 0)
- Sin `iss`/`aud` en JWT
- Commits con mensajes informativos pobres
- Sin `CONTRIBUTING.md`
- Fuentes externas de Google Fonts no incluidas en Docker image

---

## 20. REFACTORIZACIONES PROPUESTAS

### Por impacto (mayor a menor)

| # | Refactorización | Costo | Beneficio | Dificultad | Tiempo est. |
|---|---|---|---|---|---|
| 1 | CI/CD con GitHub Actions | Bajo | Crítico | Baja | 4-8h |
| 2 | Lazy loading + code splitting | Bajo | Alto | Baja | 2-4h |
| 3 | Secrets via variables de entorno (sin hardcode) | Bajo | Crítico | Baja | 1-2h |
| 4 | Purgar node_modules del repo | Bajo | Alto | Baja | 1h |
| 5 | Error boundaries en React | Bajo | Alto | Baja | 1h |
| 6 | Fix dashboard analytics (is_deleted filter) | Bajo | Alto | Baja | 30min |
| 7 | Fix register limiter bug | Bajo | Alto | Baja | 1h |
| 8 | Fix `build:ci` para incluir tsc | Trivial | Alto | Trivial | 5min |
| 9 | Redis para blocklist y rate limiters | Medio | Alto | Media | 1-2 días |
| 10 | Tests de frontend (Vitest + Testing Library) | Medio | Alto | Media | 1-2 sem |
| 11 | `SupplierRead.model_validate()` | Bajo | Medio | Baja | 15min |
| 12 | `React.lazy` para rutas admin | Bajo | Alto | Baja | 2h |
| 13 | Modal de confirmación (reemplazar `confirm()`) | Bajo | Medio | Baja | 2h |
| 14 | Favoritos persistidos en backend | Alto | Alto | Alta | 3-5 días |
| 15 | CSS Modules o Tailwind | Alto | Medio | Alta | 2-3 sem |

---

## 21. ERRORES CRÍTICOS

### [ERR-1] Credenciales en Compose → Compromiso total de auth

**Evidencia:** `docker-compose.yml` línea 22: `SECRET_KEY: change-me-in-production-please`
**Impacto:** Un JWT firmado con esta clave es verificable por cualquiera. Un atacante puede crear tokens de admin.
**Prioridad:** CRÍTICA
**Solución:**
```yaml
environment:
  SECRET_KEY: ${SECRET_KEY}   # requerido, falla si no está seteado
```
Y en startup de FastAPI:
```python
if settings.SECRET_KEY == "change-me-in-production-please":
    raise RuntimeError("SECRET_KEY no configurada para producción")
```

### [ERR-2] Dashboard cuenta productos eliminados

**Evidencia:** `dashboard.py` — queries sin filtro `is_deleted`
**Impacto:** El administrador toma decisiones basadas en datos incorrectos
**Prioridad:** ALTA
**Solución:** Agregar `.where(Product.is_deleted.is_(False))` en todas las queries de analytics de productos

### [ERR-3] TTL inconsistente entre Compose files (24h vs 30min)

**Evidencia:** `ACCESS_TOKEN_EXPIRE_MINUTES: "1440"` en root Compose
**Impacto:** Ventana de exposición de tokens comprometidos de 24 horas
**Prioridad:** ALTA
**Solución:** Unificar en el root Compose con valor de 30 min, o preferir 15 min.

### [ERR-4] bug en register limiter registra éxitos como fallos

**Evidencia:** `auth.py` ~ línea 80: `_register_limiter.register_failure()` en registro exitoso
**Impacto:** Con 10 registros exitosos, la IP queda bloqueada por 1 hora
**Prioridad:** ALTA

### [ERR-5] Source code montado en contenedor de producción

**Evidencia:** `backend/docker-compose.yml`: `volumes: - ./:/app`
**Impacto:** Proceso comprometido puede modificar el código fuente del host
**Prioridad:** ALTA
**Solución:** Eliminar ese volume en el Compose de producción

---

## 22. NIVEL DEL DESARROLLADOR

**Experiencia aproximada:** 2-4 años de desarrollo real (no bootcamp)

**Tecnologías que domina:**
- FastAPI avanzado (dependencias, middleware, lifespan, background tasks)
- SQLAlchemy 2.0 con Mapped types
- JWT y flujos de autenticación (nivel por encima del promedio)
- React 18 con hooks modernos
- TypeScript con generics y tipos condicionales
- Patrones de arquitectura (UoW, Repository, FSD)
- PostgreSQL (índices, extensiones, Alembic)
- Docker y Docker Compose

**Tecnologías que aún no domina completamente:**
- DevOps / CI/CD (ausencia total)
- Testing de frontend
- Gestión de secretos en producción (Vault, AWS Secrets Manager)
- Redis / state distribuido
- Observabilidad (Prometheus, Grafana, Sentry)
- Git workflow profesional (Conventional Commits, gitflow)
- Performance optimization (bundle size, lazy loading)

**Fortalezas técnicas:**
- Seguridad de aplicaciones web
- Arquitectura de backend
- Documentación de código
- Diseño de UI cohesivo

**Debilidades técnicas:**
- Prácticas operacionales (CI/CD, secrets, monitoring)
- Testing comprehensivo
- Optimización de performance en frontend

**Puestos que puede ocupar:**
- Backend Developer Semi Senior → Senior (con mejoras operacionales)
- Fullstack Semi Senior (con fortalezas en backend sobre frontend)
- No recomendado como único responsable de infraestructura de producción sin mentoría en DevOps

---

## 23. SI FUERA ENTREVISTADOR

**Veredicto: SÍ — con observaciones**

Este candidato sabe más de seguridad de aplicaciones que el 70% de los developers que entrevisto a nivel Semi Senior. Implementar refresh token rotation con replay prevention, SAVEPOINT en audit logs, y HttpOnly cookies correctamente no es algo que se copia de un tutorial — requiere comprensión real.

**Lo contrataría para:**
- Backend developer en un equipo con DevOps separado
- Fullstack en una startup que necesita alguien que piense en seguridad desde el día uno

**No lo contrataría todavía para:**
- Tech Lead (le falta experiencia operacional)
- Engineering Manager (sin evidencia de mentoring/liderazgo)

**En la entrevista preguntaría:**
1. "¿Por qué usaste SameSite=lax en lugar de SameSite=strict?"
2. "¿Qué pasa si el servicio se reinicia con tokens en el blocklist?"
3. "¿Cómo escalarías el rate limiter a múltiples instancias?"
4. "¿Por qué está node_modules en git?"

Las respuestas a estas preguntas revelarían si tomó las decisiones conscientemente (buena señal) o por accidente (menos buena señal).

---

## 24. SI FUERA CTO

**¿Pondría esto en producción?** No directamente.

**Qué cambiaría antes:**
1. Secretos fuera del Compose (< 1 hora)
2. TTL de access token unificado (15 min) (15 min)
3. Purgar node_modules del repo (1 hora)
4. Fix al dashboard (is_deleted filter) (30 min)
5. GitHub Actions con tests (4-8 horas)
6. Fix al register limiter bug (1 hora)
7. HTTPS configurado (Traefik o Certbot) (2-4 horas)
8. Validación de SECRET_KEY en startup (30 min)

**Con esos cambios, pondría en producción para volumen bajo (< 1000 usuarios activos), con monitoreo manual por 2 semanas.**

**Cuánto trabajo falta para Enterprise-grade:**
- Redis para state distribuido: 2-3 días
- Monitoring completo (Prometheus + Grafana + Sentry): 3-5 días
- Tests de frontend + E2E: 2-3 semanas
- Secrets management (Vault): 1 semana
- Kubernetes o ECS: 1-2 semanas
- Multi-environment (dev/staging/prod): 3-5 días

**Total estimado para producción robusta:** 5-8 semanas de trabajo a tiempo completo.

---

## 25. SI FUERA INVERSOR

**¿Transmite confianza técnica?** Sí, por encima del promedio para un proyecto individual.

**¿Parece un MVP?** Sí, y uno bien construido. La base técnica es sólida — hay decisiones que indican que el desarrollador pensó en el futuro (migrations, UoW, audit log, FSD). No es un CRUD rápido y sucio.

**¿Parece un producto serio?** Para el mercado objetivo (PyME distribuidora automotriz argentina), podría funcionar en producción con las correcciones mencionadas. No necesita una arquitectura más compleja para ese mercado.

**¿Parece un proyecto académico?** No. La presencia de audit log, refresh token rotation y middleware stack indica que el developer pensó en casos reales, no en cumplir una rúbrica académica.

**Riesgo técnico principal:** Key-man risk. Si el desarrollador no está disponible, el proyecto tiene documentación suficiente para que otro developer lo entienda, pero la deuda técnica (sin CI, sin tests de frontend) hace peligroso escalar el equipo.

---

## 26. SCORE FINAL

| Dimensión | Score (1-100) |
|---|---|
| Arquitectura | 74 |
| Código | 73 |
| Backend | 80 |
| Frontend | 60 |
| Escalabilidad | 50 |
| Seguridad | 70 |
| DevOps | 30 |
| Testing | 28 |
| Diseño visual | 77 |
| Experiencia del usuario | 68 |
| Calidad general | 68 |
| Innovación | 62 |
| Nivel profesional | 72 |
| **PROMEDIO FINAL** | **63/100** |

> El alto score de backend arrastra hacia arriba. El bajísimo score de DevOps y Testing arrastra hacia abajo. El proyecto tiene un núcleo técnico de 75-80 puntos lastrado por ausencias operacionales de 30-35 puntos.

---

## 27. ROADMAP DE MEJORA

### Mejoras rápidas (1–3 días)

| Tarea | Impacto | Prioridad |
|---|---|---|
| Sacar credenciales de Compose → vars de entorno | Crítico | 🔴 1 |
| Agregar validación de SECRET_KEY en startup | Crítico | 🔴 2 |
| `build:ci` → incluir tsc | Alto | 🟠 3 |
| Purgar `node_modules` y `__pycache__` de git | Alto | 🟠 4 |
| Fix dashboard analytics (is_deleted) | Alto | 🟠 5 |
| Fix register limiter (clave incorrecta + éxito como fallo) | Alto | 🟠 6 |
| Unificar ACCESS_TOKEN_EXPIRE_MINUTES en 15-30 min | Alto | 🟠 7 |
| Fix `_to_read()` en suppliers.py | Medio | 🟡 8 |
| Agregar `CHECK` constraints a DB (stock, price) | Medio | 🟡 9 |
| Mover `<style>shimmer` a CSS global | Bajo | 🟢 10 |

### Mejoras importantes (1–2 semanas)

| Tarea | Impacto | Estimado |
|---|---|---|
| GitHub Actions: lint + tests en cada push/PR | Crítico | 2-3 días |
| `React.lazy` + Suspense para rutas admin | Alto | 1 día |
| Error Boundaries en React | Alto | 4h |
| Tests de backend para módulos sin cobertura (users, quotes, suppliers, dashboard) | Alto | 3-5 días |
| Modal de confirmación (reemplazar `confirm()`) | Medio | 4h |
| Configurar HTTPS (Traefik + Let's Encrypt o Certbot) | Crítico para producción | 1 día |
| Paginación en `GET /quotes/me` | Medio | 2h |
| Cache de 60s en dashboard analytics | Medio | 2h |
| Trusted proxy validation para X-Forwarded-For | Alto | 2h |

### Mejoras de mediano plazo (1–2 meses)

| Tarea | Impacto | Estimado |
|---|---|---|
| Redis para token blocklist y rate limiters | Alto | 3-5 días |
| Tests de frontend con Vitest + Testing Library | Alto | 2-3 semanas |
| Sentry para error tracking | Alto | 1 día |
| Git workflow: Conventional Commits + branch strategy | Medio | Ongoing |
| Favoritos persistidos en backend | Medio | 3-5 días |
| Jinja2 templates para emails | Bajo | 2 días |
| Composite indexes en DB | Medio | 1 día |
| Supplier: unique constraint en nombre | Medio | 30min + migration |
| `iss` y `aud` en JWT | Bajo | 1h |
| Habilitar Swagger auth con cookie support | Bajo | 2h |
| Lazy loading + virtualización para listas largas | Medio | 3-5 días |

### Mejoras de largo plazo (3–6 meses)

| Tarea | Impacto | Estimado |
|---|---|---|
| E2E tests con Playwright | Alto | 2-3 semanas |
| Monitoring completo: Prometheus + Grafana | Alto | 1-2 semanas |
| Multi-environment (dev/staging/prod) con Terraform o Pulumi | Alto | 1-2 semanas |
| Secrets management (AWS Secrets Manager, Vault, Doppler) | Alto | 1 semana |
| Migrar estilos a CSS Modules o Tailwind | Medio | 3-4 semanas |
| Pedidos con backend real (actualmente es un placeholder) | Alto | 1-2 semanas |
| Upload de imágenes (actualmente solo URL string) | Medio | 1 semana |
| Roles adicionales (MANAGER, SUPPORT) | Medio | 3-5 días |
| API versioning explícito (/api/v1/) | Bajo | 1 día |
| Kubernetes (si escala a múltiples instancias) | Alto | 2-4 semanas |

---

## VEREDICTO GLOBAL

**Grado de madurez: MVP avanzado / Beta**

No es un prototipo descartable: las decisiones de arquitectura y seguridad son sólidas y pensadas para crecer. No es un producto listo para producción: las ausencias operacionales (CI/CD, secretos, monitoring) crean riesgos reales en un entorno real.

El núcleo del backend (auth, UoW, audit log, rate limiting, migraciones) es de calidad Beta o mejor. El frontend tiene features completas pero carece de resiliencia (sin error boundaries, sin tests). El DevOps es el talón de Aquiles: está en nivel Prototipo.

**Para alcanzar el siguiente nivel (Producción Inicial)** se necesitan principalmente las mejoras rápidas e importantes descritas arriba, con foco en: secretos fuera del código, CI/CD funcional, Error Boundaries, lazy loading y HTTPS. Son aproximadamente 2 semanas de trabajo enfocado. El codebase lo soporta — la estructura es lo suficientemente buena como para que estas mejoras no requieran refactorizar lo que ya existe.

---

*Auditoría realizada el 2026-06-29. Evaluador: Panel técnico AI basado en estándares de la industria. Repositorio analizado: Crow Repuestos v3 (commit 3668e81).*
