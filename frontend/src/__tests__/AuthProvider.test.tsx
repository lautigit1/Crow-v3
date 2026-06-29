import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AuthProvider, useAuth } from "@/app/providers/AuthProvider";
import type { User } from "@/entities/session/model";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUser: User = {
  id: 1,
  full_name: "Test User",
  email: "test@crow.com",
  phone: null,
  role: "USER",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  last_login_at: null,
};

const mockAdmin: User = { ...mockUser, id: 2, role: "ADMIN", email: "admin@crow.com" };

// ─── MSW server ──────────────────────────────────────────────────────────────

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json(mockUser)),
  http.post("/api/auth/login", () => HttpResponse.json({ user: mockUser })),
  http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })),
);

beforeEach(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.clearAllMocks(); });
afterEach(() => server.close());

// ─── Helper ──────────────────────────────────────────────────────────────────

function AuthStatus() {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="admin">{String(isAdmin)}</div>
      <div data-testid="email">{user?.email ?? "none"}</div>
    </div>
  );
}

function renderWithAuth(ui = <AuthStatus />) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AuthProvider", () => {
  describe("inicialización", () => {
    it("muestra loading mientras resuelve /me", () => {
      renderWithAuth();
      expect(screen.getByText("loading")).toBeInTheDocument();
    });

    it("setea el usuario cuando /me responde 200", async () => {
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId("email")).toHaveTextContent("test@crow.com"));
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    });

    it("deja user en null cuando /me responde 401", async () => {
      server.use(http.get("/api/auth/me", () => new HttpResponse(null, { status: 401 })));
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId("authenticated")).toHaveTextContent("false"));
      expect(screen.getByTestId("email")).toHaveTextContent("none");
    });
  });

  describe("isAdmin", () => {
    it("isAdmin es false para rol USER", async () => {
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId("admin")).toHaveTextContent("false"));
    });

    it("isAdmin es true para rol ADMIN", async () => {
      server.use(http.get("/api/auth/me", () => HttpResponse.json(mockAdmin)));
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId("admin")).toHaveTextContent("true"));
    });
  });

  describe("login()", () => {
    it("setea el usuario tras un login exitoso", async () => {
      server.use(http.get("/api/auth/me", () => new HttpResponse(null, { status: 401 })));

      function LoginTest() {
        const { login, isAuthenticated, user } = useAuth();
        return (
          <div>
            <div data-testid="auth">{String(isAuthenticated)}</div>
            <div data-testid="email">{user?.email ?? "none"}</div>
            <button onClick={() => login("test@crow.com", "Password1!")}>login</button>
          </div>
        );
      }

      renderWithAuth(<LoginTest />);
      await waitFor(() => expect(screen.getByTestId("auth")).toHaveTextContent("false"));

      await act(async () => {
        screen.getByRole("button", { name: "login" }).click();
      });

      await waitFor(() => expect(screen.getByTestId("auth")).toHaveTextContent("true"));
      expect(screen.getByTestId("email")).toHaveTextContent("test@crow.com");
    });
  });

  describe("logout()", () => {
    it("limpia el usuario inmediatamente sin esperar al servidor", async () => {
      // El servidor tarda en responder al logout
      server.use(
        http.post("/api/auth/logout", async () => {
          await new Promise((r) => setTimeout(r, 500));
          return new HttpResponse(null, { status: 204 });
        })
      );

      function LogoutTest() {
        const { logout, isAuthenticated } = useAuth();
        return (
          <div>
            <div data-testid="auth">{String(isAuthenticated)}</div>
            <button onClick={logout}>logout</button>
          </div>
        );
      }

      renderWithAuth(<LogoutTest />);
      await waitFor(() => expect(screen.getByTestId("auth")).toHaveTextContent("true"));

      act(() => {
        screen.getByRole("button", { name: "logout" }).click();
      });

      // El estado React se limpia inmediatamente — no espera los 500ms del server
      expect(screen.getByTestId("auth")).toHaveTextContent("false");
    });
  });
});
