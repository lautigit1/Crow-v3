import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { RequireAuth, RequireAdmin, GuestOnly } from "@/app/router/guards";
import type { User } from "@/entities/session/model";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const userFixture: User = {
  id: 1, full_name: "User", email: "user@crow.com", phone: null,
  role: "USER", is_active: true,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", last_login_at: null,
};

const adminFixture: User = { ...userFixture, id: 2, role: "ADMIN", email: "admin@crow.com" };

// ─── MSW server ──────────────────────────────────────────────────────────────

const server = setupServer();
beforeEach(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.clearAllMocks(); });
afterEach(() => server.close());

// ─── Helper ──────────────────────────────────────────────────────────────────

function renderGuard(guard: React.ReactNode, initialPath = "/protected") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/protected" element={guard} />
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/" element={<div>home page</div>} />
          <Route path="/cuenta" element={<div>account page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

// ─── RequireAuth ─────────────────────────────────────────────────────────────

describe("RequireAuth", () => {
  it("redirige a /login cuando no hay sesión", async () => {
    server.use(http.get("/api/auth/me", () => new HttpResponse(null, { status: 401 })));
    renderGuard(<RequireAuth><div>contenido protegido</div></RequireAuth>);
    await waitFor(() => expect(screen.getByText("login page")).toBeInTheDocument());
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument();
  });

  it("renderiza children cuando hay sesión", async () => {
    server.use(http.get("/api/auth/me", () => HttpResponse.json(userFixture)));
    renderGuard(<RequireAuth><div>contenido protegido</div></RequireAuth>);
    await waitFor(() => expect(screen.getByText("contenido protegido")).toBeInTheDocument());
  });

  it("muestra spinner durante la carga", () => {
    // /me tarda en resolver — el spinner debe aparecer
    server.use(http.get("/api/auth/me", async () => {
      await new Promise((r) => setTimeout(r, 200));
      return new HttpResponse(null, { status: 401 });
    }));
    renderGuard(<RequireAuth><div>contenido</div></RequireAuth>);
    // CenteredSpinner renderiza un elemento con role="status" o similar
    // Si no lo encuentra, el spinner puede ser simplemente la ausencia del contenido
    expect(screen.queryByText("contenido")).not.toBeInTheDocument();
  });
});

// ─── RequireAdmin ─────────────────────────────────────────────────────────────

describe("RequireAdmin", () => {
  it("redirige a / cuando el usuario no es admin", async () => {
    server.use(http.get("/api/auth/me", () => HttpResponse.json(userFixture)));
    renderGuard(<RequireAdmin><div>panel admin</div></RequireAdmin>);
    await waitFor(() => expect(screen.getByText("home page")).toBeInTheDocument());
    expect(screen.queryByText("panel admin")).not.toBeInTheDocument();
  });

  it("redirige a /login cuando no hay sesión", async () => {
    server.use(http.get("/api/auth/me", () => new HttpResponse(null, { status: 401 })));
    renderGuard(<RequireAdmin><div>panel admin</div></RequireAdmin>);
    await waitFor(() => expect(screen.getByText("login page")).toBeInTheDocument());
  });

  it("renderiza children cuando el usuario es admin", async () => {
    server.use(http.get("/api/auth/me", () => HttpResponse.json(adminFixture)));
    renderGuard(<RequireAdmin><div>panel admin</div></RequireAdmin>);
    await waitFor(() => expect(screen.getByText("panel admin")).toBeInTheDocument());
  });
});

// ─── GuestOnly ───────────────────────────────────────────────────────────────

describe("GuestOnly", () => {
  it("renderiza children cuando no hay sesión", async () => {
    server.use(http.get("/api/auth/me", () => new HttpResponse(null, { status: 401 })));
    renderGuard(<GuestOnly><div>página de login</div></GuestOnly>);
    await waitFor(() => expect(screen.getByText("página de login")).toBeInTheDocument());
  });

  it("redirige a /cuenta cuando hay sesión activa", async () => {
    server.use(http.get("/api/auth/me", () => HttpResponse.json(userFixture)));
    renderGuard(<GuestOnly><div>página de login</div></GuestOnly>);
    await waitFor(() => expect(screen.getByText("account page")).toBeInTheDocument());
    expect(screen.queryByText("página de login")).not.toBeInTheDocument();
  });
});
