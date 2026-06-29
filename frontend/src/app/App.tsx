import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "@/app/layouts/PublicLayout";
import { RequireAuth, RequireAdmin, GuestOnly } from "@/app/router/guards";
import { ErrorBoundary } from "@/app/providers/ErrorBoundary";
import { CenteredSpinner } from "@/shared/ui";

// ─── Eager: páginas públicas críticas (parte del bundle inicial) ──────────────
import { HomePage } from "@/pages/home/HomePage";
import { CatalogPage } from "@/pages/catalog/CatalogPage";
import { BrandsPage } from "@/pages/brands/BrandsPage";
import { ContactPage } from "@/pages/contact/ContactPage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";

// ─── Lazy: área de cuenta (carga al navegar a /cuenta) ───────────────────────
const AccountLayout       = lazy(() => import("@/pages/account/AccountLayout").then((m) => ({ default: m.AccountLayout })));
const ProfilePage         = lazy(() => import("@/pages/account/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const MyQuotesPage        = lazy(() => import("@/pages/account/MyQuotesPage").then((m) => ({ default: m.MyQuotesPage })));
const MyOrdersPage        = lazy(() => import("@/pages/account/MyOrdersPage").then((m) => ({ default: m.MyOrdersPage })));
const FavoritesPage       = lazy(() => import("@/pages/account/FavoritesPage").then((m) => ({ default: m.FavoritesPage })));
const AccountSettingsPage = lazy(() => import("@/pages/account/AccountSettingsPage").then((m) => ({ default: m.AccountSettingsPage })));

// ─── Lazy: panel admin (carga al navegar a /admin) ───────────────────────────
const AdminLayout         = lazy(() => import("@/pages/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const DashboardPage       = lazy(() => import("@/pages/admin/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const AdminProductsPage   = lazy(() => import("@/pages/admin/AdminProductsPage").then((m) => ({ default: m.AdminProductsPage })));
const AdminInventoryPage  = lazy(() => import("@/pages/admin/AdminInventoryPage").then((m) => ({ default: m.AdminInventoryPage })));
const AdminCategoriesPage = lazy(() => import("@/pages/admin/AdminCategoriesPage").then((m) => ({ default: m.AdminCategoriesPage })));
const AdminBrandsPage     = lazy(() => import("@/pages/admin/AdminBrandsPage").then((m) => ({ default: m.AdminBrandsPage })));
const AdminQuotesPage     = lazy(() => import("@/pages/admin/AdminQuotesPage").then((m) => ({ default: m.AdminQuotesPage })));
const AdminUsersPage      = lazy(() => import("@/pages/admin/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })));
const AdminReportsPage    = lazy(() => import("@/pages/admin/AdminReportsPage").then((m) => ({ default: m.AdminReportsPage })));
const AdminAuditPage      = lazy(() => import("@/pages/admin/AdminAuditPage").then((m) => ({ default: m.AdminAuditPage })));
const AdminSettingsPage   = lazy(() => import("@/pages/admin/AdminSettingsPage").then((m) => ({ default: m.AdminSettingsPage })));
const AdminSuppliersPage  = lazy(() => import("@/pages/admin/AdminSuppliersPage").then((m) => ({ default: m.AdminSuppliersPage })));

// ─── Lazy: páginas legales y FAQ (raramente visitadas) ───────────────────────
const FaqPage             = lazy(() => import("@/pages/faq/FaqPage").then((m) => ({ default: m.FaqPage })));
const PrivacidadPage      = lazy(() => import("@/pages/legal/PrivacidadPage").then((m) => ({ default: m.PrivacidadPage })));
const TerminosPage        = lazy(() => import("@/pages/legal/TerminosPage").then((m) => ({ default: m.TerminosPage })));
const CookiesPage         = lazy(() => import("@/pages/legal/CookiesPage").then((m) => ({ default: m.CookiesPage })));
const LicenciasPage       = lazy(() => import("@/pages/legal/LicenciasPage").then((m) => ({ default: m.LicenciasPage })));
const AccesibilidadPage   = lazy(() => import("@/pages/legal/AccesibilidadPage").then((m) => ({ default: m.AccesibilidadPage })));

export function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/marcas" element={<BrandsPage />} />
        <Route path="/contacto" element={<ContactPage />} />

        {/* Legal y FAQ — lazy */}
        <Route path="/faq" element={<Suspense fallback={<CenteredSpinner />}><FaqPage /></Suspense>} />
        <Route path="/legal/privacidad" element={<Suspense fallback={<CenteredSpinner />}><PrivacidadPage /></Suspense>} />
        <Route path="/legal/terminos" element={<Suspense fallback={<CenteredSpinner />}><TerminosPage /></Suspense>} />
        <Route path="/legal/cookies" element={<Suspense fallback={<CenteredSpinner />}><CookiesPage /></Suspense>} />
        <Route path="/legal/licencias" element={<Suspense fallback={<CenteredSpinner />}><LicenciasPage /></Suspense>} />
        <Route path="/legal/accesibilidad" element={<Suspense fallback={<CenteredSpinner />}><AccesibilidadPage /></Suspense>} />

        {/* Client account area — lazy */}
        <Route
          path="/cuenta"
          element={
            <RequireAuth>
              <Suspense fallback={<CenteredSpinner />}>
                <AccountLayout />
              </Suspense>
            </RequireAuth>
          }
        >
          <Route index element={<ProfilePage />} />
          <Route path="cotizaciones" element={<MyQuotesPage />} />
          <Route path="pedidos" element={<MyOrdersPage />} />
          <Route path="favoritos" element={<FavoritesPage />} />
          <Route path="configuracion" element={<AccountSettingsPage />} />
        </Route>
      </Route>

      {/* Auth (guest only, full-screen) */}
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/registro" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Admin (ADMIN role only) — lazy + ErrorBoundary propio */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <ErrorBoundary section="el panel de administración">
              <Suspense fallback={<CenteredSpinner />}>
                <AdminLayout />
              </Suspense>
            </ErrorBoundary>
          </RequireAdmin>
        }
      >
        <Route index element={<Suspense fallback={<CenteredSpinner />}><DashboardPage /></Suspense>} />
        <Route path="productos" element={<Suspense fallback={<CenteredSpinner />}><AdminProductsPage /></Suspense>} />
        <Route path="inventario" element={<Suspense fallback={<CenteredSpinner />}><AdminInventoryPage /></Suspense>} />
        <Route path="categorias" element={<Suspense fallback={<CenteredSpinner />}><AdminCategoriesPage /></Suspense>} />
        <Route path="marcas" element={<Suspense fallback={<CenteredSpinner />}><AdminBrandsPage /></Suspense>} />
        <Route path="cotizaciones" element={<Suspense fallback={<CenteredSpinner />}><AdminQuotesPage /></Suspense>} />
        <Route path="proveedores" element={<Suspense fallback={<CenteredSpinner />}><AdminSuppliersPage /></Suspense>} />
        <Route path="usuarios" element={<Suspense fallback={<CenteredSpinner />}><AdminUsersPage /></Suspense>} />
        <Route path="reportes" element={<Suspense fallback={<CenteredSpinner />}><AdminReportsPage /></Suspense>} />
        <Route path="auditoria" element={<Suspense fallback={<CenteredSpinner />}><AdminAuditPage /></Suspense>} />
        <Route path="configuracion" element={<Suspense fallback={<CenteredSpinner />}><AdminSettingsPage /></Suspense>} />
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
