import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import type { Notification } from "@/entities/notification";
import type { ServerEvent } from "@/shared/lib/serverEvents";

/**
 * La campana tiene tres trabajos y se prueba uno por uno: mostrar el número
 * correcto, no aparecer para invitados, y reaccionar al evento del servidor sin
 * que nadie recargue nada.
 */

const mockList = vi.fn();
const mockUnread = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAll = vi.fn();

vi.mock("@/entities/notification", async () => {
  const actual = await vi.importActual<typeof import("@/entities/notification")>(
    "@/entities/notification",
  );
  return {
    ...actual,
    notificationApi: {
      list: (...a: unknown[]) => mockList(...a),
      unreadCount: () => mockUnread(),
      markRead: (...a: unknown[]) => mockMarkRead(...a),
      markAllRead: () => mockMarkAll(),
    },
  };
});

// Se captura el handler para poder disparar eventos del servidor a mano.
let emitir: ((e: ServerEvent) => void) | null = null;
vi.mock("@/shared/lib/serverEvents", () => ({
  useServerEvent: (h: (e: ServerEvent) => void) => {
    emitir = h;
  },
}));

let usuario: { full_name: string } | null = { full_name: "Lautaro Salinas" };
vi.mock("@/entities/session", () => ({
  useAuth: () => ({ user: usuario }),
}));

function noti(over: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    type: "Estado del pedido",
    title: "Tu pedido está confirmado",
    body: "Verificamos stock y precio.",
    link: "/cuenta/pedidos",
    read_at: null,
    created_at: new Date().toISOString(),
    ...over,
  };
}

function renderBell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  emitir = null;
  usuario = { full_name: "Lautaro Salinas" };
  mockUnread.mockResolvedValue(2);
  mockList.mockResolvedValue({ items: [noti()], total: 1, unread: 1 });
});

// ─── Visibilidad ─────────────────────────────────────────────────────────────

describe("NotificationBell — visibilidad", () => {
  it("no se muestra para un invitado", () => {
    usuario = null;
    renderBell();
    expect(screen.queryByLabelText(/Notificaciones/)).not.toBeInTheDocument();
  });

  it("no le pide el contador al servidor si no hay sesión", () => {
    usuario = null;
    renderBell();
    // Sin esto, cada visitante anónimo generaría un 401 por carga de página.
    expect(mockUnread).not.toHaveBeenCalled();
  });
});

// ─── Badge ───────────────────────────────────────────────────────────────────

describe("NotificationBell — contador", () => {
  it("muestra el número de no leídas", async () => {
    renderBell();
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("no muestra badge cuando no hay nada sin leer", async () => {
    mockUnread.mockResolvedValue(0);
    renderBell();
    await waitFor(() => expect(mockUnread).toHaveBeenCalled());
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("corta en 9+ para no romper el círculo", async () => {
    mockUnread.mockResolvedValue(37);
    renderBell();
    expect(await screen.findByText("9+")).toBeInTheDocument();
  });

  it("el nombre accesible incluye cuántas hay sin leer", async () => {
    renderBell();
    expect(await screen.findByLabelText("Notificaciones (2 sin leer)")).toBeInTheDocument();
  });
});

// ─── Panel ───────────────────────────────────────────────────────────────────

describe("NotificationBell — panel", () => {
  it("no pide la lista hasta que se abre", async () => {
    renderBell();
    await waitFor(() => expect(mockUnread).toHaveBeenCalled());
    // La lista es trabajo de más si el panel nunca se abre.
    expect(mockList).not.toHaveBeenCalled();
  });

  it("al abrir pide la lista y la muestra", async () => {
    const user = userEvent.setup();
    renderBell();
    await user.click(await screen.findByLabelText(/^Notificaciones/));

    expect(await screen.findByText("Tu pedido está confirmado")).toBeInTheDocument();
    expect(screen.getByText("Verificamos stock y precio.")).toBeInTheDocument();
  });

  it("muestra el vacío cuando no hay ninguna", async () => {
    const user = userEvent.setup();
    mockUnread.mockResolvedValue(0);
    mockList.mockResolvedValue({ items: [], total: 0, unread: 0 });
    renderBell();
    await user.click(await screen.findByLabelText(/^Notificaciones/));

    expect(await screen.findByText(/No tenés notificaciones todavía/)).toBeInTheDocument();
  });

  it("marca como leída al tocar una no leída", async () => {
    const user = userEvent.setup();
    mockMarkRead.mockResolvedValue(noti({ read_at: new Date().toISOString() }));
    renderBell();
    await user.click(await screen.findByLabelText(/^Notificaciones/));
    await user.click(await screen.findByText("Tu pedido está confirmado"));

    // Se verifica solo el primer argumento: TanStack Query v5 le agrega un
    // segundo con el contexto de la mutación (`{ client, meta, mutationKey }`).
    // Un `toHaveBeenCalledWith(1)` exacto falla por eso, y encadenarlo a la
    // forma interna de la librería haría que el test se rompa en cada upgrade.
    await waitFor(() => expect(mockMarkRead).toHaveBeenCalled());
    expect(mockMarkRead.mock.calls[0][0]).toBe(1);
  });

  it("no vuelve a marcar una que ya estaba leída", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      items: [noti({ read_at: new Date().toISOString() })],
      total: 1,
      unread: 0,
    });
    renderBell();
    await user.click(await screen.findByLabelText(/^Notificaciones/));
    await user.click(await screen.findByText("Tu pedido está confirmado"));

    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it("marca todas", async () => {
    const user = userEvent.setup();
    mockMarkAll.mockResolvedValue({ unread: 0 });
    renderBell();
    await user.click(await screen.findByLabelText(/^Notificaciones/));
    await user.click(await screen.findByText("Marcar todas"));

    await waitFor(() => expect(mockMarkAll).toHaveBeenCalled());
  });

  it("no ofrece marcar todas si no hay ninguna sin leer", async () => {
    const user = userEvent.setup();
    mockUnread.mockResolvedValue(0);
    renderBell();
    await user.click(await screen.findByLabelText(/^Notificaciones/));

    expect(screen.queryByText("Marcar todas")).not.toBeInTheDocument();
  });
});

// ─── Sonido ──────────────────────────────────────────────────────────────────

describe("NotificationBell — sonido", () => {
  it("ofrece silenciarlo, y la etiqueta no se confunde con la de la campana", async () => {
    const user = userEvent.setup();
    renderBell();
    await user.click(await screen.findByLabelText(/^Notificaciones/));

    // "Silenciar avisos" no contiene "Notificaciones" a propósito: dos
    // etiquetas que se contienen una a la otra hacen ambigua cualquier búsqueda
    // por nombre accesible.
    expect(await screen.findByLabelText("Silenciar avisos")).toBeInTheDocument();
  });

  it("al silenciarlo cambia la etiqueta y queda guardado", async () => {
    const user = userEvent.setup();
    renderBell();
    await user.click(await screen.findByLabelText(/^Notificaciones/));
    await user.click(await screen.findByLabelText("Silenciar avisos"));

    expect(await screen.findByLabelText("Activar sonido de avisos")).toBeInTheDocument();
    expect(localStorage.getItem("crow:noti-sonido")).toBe("off");
  });
});

// ─── En vivo ─────────────────────────────────────────────────────────────────

describe("NotificationBell — en vivo", () => {
  it("el evento del servidor refresca el contador sin recargar", async () => {
    renderBell();
    await waitFor(() => expect(mockUnread).toHaveBeenCalledTimes(1));

    mockUnread.mockResolvedValue(5);
    act(() => emitir!({ type: "notification.created" }));

    expect(await screen.findByText("5")).toBeInTheDocument();
  });

  it("ignora los eventos que no son suyos", async () => {
    renderBell();
    await waitFor(() => expect(mockUnread).toHaveBeenCalledTimes(1));

    act(() => emitir!({ type: "order.updated", order_id: 3 }));

    // Un evento de otra clase no tiene que provocar tráfico acá. La espera va
    // dentro de `act` para que cualquier actualización de estado que caiga en
    // ese rato quede contenida -- si no, React avisa que hubo un update fuera
    // de act y ese warning tapa los que sí importan.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(mockUnread).toHaveBeenCalledTimes(1);
  });
});
