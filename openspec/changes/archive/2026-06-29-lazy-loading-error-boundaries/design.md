# Design: lazy-loading-error-boundaries

## Error Boundary

**Archivo nuevo:** `frontend/src/app/providers/ErrorBoundary.tsx`

React Error Boundaries requieren una clase (no existe hook equivalente). La implementación:
- Captura cualquier error en el árbol hijo
- Muestra un fallback con mensaje y botón "Recargar"
- Acepta prop `fallback` opcional para customizar el mensaje por sección

**Árbol de wrapping:**

```
<ErrorBoundary>           ← global, en main.tsx
  <BrowserRouter>
    <AuthProvider>
      <App>
        <ErrorBoundary section="admin">   ← sección admin, en App.tsx
          <AdminLayout + páginas admin>
        </ErrorBoundary>
      </App>
    </AuthProvider>
  </BrowserRouter>
</ErrorBoundary>
```

## Lazy Loading

**Estrategia de splits:**

| Grupo | Páginas | Carga |
|---|---|---|
| Eager (siempre) | HomePage, CatalogPage, BrandsPage, ContactPage, NotFoundPage, auth pages | Inicial |
| Lazy — account | ProfilePage, MyQuotesPage, MyOrdersPage, FavoritesPage, AccountSettingsPage, AccountLayout | Al navegar a /cuenta |
| Lazy — admin | AdminLayout + las 11 páginas admin | Al navegar a /admin |
| Lazy — legal | PrivacidadPage, TerminosPage, CookiesPage, LicenciasPage, AccesibilidadPage, FaqPage | Al navegar a /legal o /faq |

**Implementación en App.tsx:**

```tsx
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage").then(m => ({ default: m.DashboardPage })));
// ... etc
```

**Suspense fallback:**

Un componente `<PageSpinner />` minimalista (spinner centrado) se usa como fallback de `<Suspense>`. Se envuelve cada grupo de rutas lazy en su propio `<Suspense>` para granularidad.

## Archivos a modificar

- `frontend/src/app/providers/ErrorBoundary.tsx` — nuevo componente
- `frontend/src/main.tsx` — envolver App en ErrorBoundary global
- `frontend/src/app/App.tsx` — convertir imports a lazy, agregar Suspense y ErrorBoundary de admin
