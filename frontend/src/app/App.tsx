import { Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "@/app/layouts/PublicLayout";
import { RequireAuth, RequireAdmin, GuestOnly } from "@/app/router/guards";

import { HomePage } from "@/pages/home/HomePage";
import { CatalogPage } from "@/pages/catalog/CatalogPage";
import { BrandsPage } from "@/pages/brands/BrandsPage";
import { ContactPage } from "@/pages/contact/ContactPage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";

import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";

import { AccountLayout } from "@/pages/account/AccountLayout";
import { ProfilePage } from "@/pages/account/ProfilePage";
import { MyQuotesPage } from "@/pages/account/MyQuotesPage";
import { MyOrdersPage } from "@/pages/account/MyOrdersPage";
import { FavoritesPage } from "@/pages/account/FavoritesPage";
import { AccountSettingsPage } from "@/pages/account/AccountSettingsPage";

import { AdminLayout } from "@/pages/admin/AdminLayout";
import { DashboardPage } from "@/pages/admin/DashboardPage";
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";
import { AdminInventoryPage } from "@/pages/admin/AdminInventoryPage";
import { AdminCategoriesPage } from "@/pages/admin/AdminCategoriesPage";
import { AdminBrandsPage } from "@/pages/admin/AdminBrandsPage";
import { AdminQuotesPage } from "@/pages/admin/AdminQuotesPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminReportsPage } from "@/pages/admin/AdminReportsPage";
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminSuppliersPage } from "@/pages/admin/AdminSuppliersPage";
import { FaqPage } from "@/pages/faq/FaqPage";
import { PrivacidadPage } from "@/pages/legal/PrivacidadPage";
import { TerminosPage } from "@/pages/legal/TerminosPage";
import { CookiesPage } from "@/pages/legal/CookiesPage";
import { LicenciasPage } from "@/pages/legal/LicenciasPage";
import { AccesibilidadPage } from "@/pages/legal/AccesibilidadPage";

export function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/marcas" element={<BrandsPage />} />
        <Route path="/contacto" element={<ContactPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/legal/privacidad" element={<PrivacidadPage />} />
        <Route path="/legal/terminos" element={<TerminosPage />} />
        <Route path="/legal/cookies" element={<CookiesPage />} />
        <Route path="/legal/licencias" element={<LicenciasPage />} />
        <Route path="/legal/accesibilidad" element={<AccesibilidadPage />} />

        {/* Client account area */}
        <Route
          path="/cuenta"
          element={
            <RequireAuth>
              <AccountLayout />
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
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/registro"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Admin (ADMIN role only) */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="productos" element={<AdminProductsPage />} />
        <Route path="inventario" element={<AdminInventoryPage />} />
        <Route path="categorias" element={<AdminCategoriesPage />} />
        <Route path="marcas" element={<AdminBrandsPage />} />
        <Route path="cotizaciones" element={<AdminQuotesPage />} />
        <Route path="proveedores" element={<AdminSuppliersPage />} />
        <Route path="usuarios" element={<AdminUsersPage />} />
        <Route path="reportes" element={<AdminReportsPage />} />
        <Route path="auditoria" element={<AdminAuditPage />} />
        <Route path="configuracion" element={<AdminSettingsPage />} />
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
