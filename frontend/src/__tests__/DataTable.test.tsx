import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type Column } from "@/shared/ui";

/**
 * La tabla del panel, y sobre todo **su versión en tarjetas**.
 *
 * Abajo de 768px una tabla de siete columnas no entra: antes había
 * `min-w-[640px]` y scroll horizontal, o sea el problema empujado a la persona.
 * Ahora cada fila se convierte en tarjeta.
 *
 * ⚠ **Se renderiza UNA sola de las dos vistas.** El primer intento las dejaba a
 * las dos en el DOM alternando con `hidden`/`md:hidden` -- sin listener de
 * resize, sin re-render -- y rompió 34 tests que ya existían: cada `getByText`
 * de las suites del panel encontraba dos resultados. No era un problema de los
 * tests sino la señal de que la duplicación se filtra a todo lo que consulte el
 * DOM. Por eso ahora la decisión pasa por `useBreakpoint`.
 *
 * jsdom arranca con `innerWidth` en 1024, así que por defecto se ve la tabla y
 * las suites que ya existían no cambian. Para probar las tarjetas hay que
 * angostar la ventana a mano.
 */

type Fila = { id: number; cliente: string; total: string };

const filas: Fila[] = [
  { id: 1, cliente: "Juan Pérez", total: "$45.000" },
  { id: 2, cliente: "Ana López", total: "$8.500" },
];

/** Angosta la ventana y avisa, que es lo que `useBreakpoint` escucha. */
function pantallaAngosta(px = 390) {
  window.innerWidth = px;
  window.dispatchEvent(new Event("resize"));
}

afterEach(() => {
  window.innerWidth = 1024;
});

function columnas(extra?: Column<Fila>): Column<Fila>[] {
  return [
    { rol: "titulo", header: "#", render: (f) => `Pedido ${f.id}` },
    { rol: "subtitulo", header: "Cliente", render: (f) => f.cliente },
    { header: "Total", render: (f) => f.total },
    { rol: "accion", header: "", render: (f) => <button>Abrir {f.id}</button> },
    ...(extra ? [extra] : []),
  ];
}

describe("Escritorio", () => {
  it("muestra la tabla y ninguna tarjeta", () => {
    render(<DataTable columns={columnas()} rows={filas} getKey={(f) => f.id} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    // Cada dato aparece UNA sola vez: es lo que rompió el primer intento.
    expect(screen.getAllByText("Juan Pérez")).toHaveLength(1);
  });
});

describe("Vista de tarjetas", () => {
  it("abajo de 768px no hay tabla", () => {
    pantallaAngosta();
    render(<DataTable columns={columnas()} rows={filas} getKey={(f) => f.id} />);

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Pedido 1")).toBeInTheDocument();
  });

  it("arma una tarjeta por fila con título, subtítulo y datos", () => {
    pantallaAngosta();
    render(<DataTable columns={columnas()} rows={filas} getKey={(f) => f.id} />);

    expect(screen.getByText("Pedido 1")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("$45.000")).toBeInTheDocument();
  });

  it("las columnas comunes llevan su etiqueta, que en la tabla la daba el encabezado", () => {
    // En la tabla el `<th>` da el contexto una vez arriba de todo. En una
    // tarjeta cada valor queda huérfano sin la etiqueta al lado.
    pantallaAngosta();
    render(<DataTable columns={columnas()} rows={filas} getKey={(f) => f.id} />);

    expect(screen.getAllByText("Total")).toHaveLength(2); // una por tarjeta
  });

  it("una columna con rol 'oculta' no aparece en la tarjeta", () => {
    pantallaAngosta();
    render(
      <DataTable
        columns={columnas({ rol: "oculta", header: "Interno", render: () => "dato-redundante" })}
        rows={filas}
        getKey={(f) => f.id}
      />,
    );

    expect(screen.queryByText("dato-redundante")).toBeNull();
  });

  it("tocar una acción no dispara el click de la tarjeta", async () => {
    // Sin `stopPropagation`, tocar "Abrir" ejecutaría la acción Y abriría la
    // ficha: dos cosas de un solo toque, que en un celular es peor que en
    // escritorio porque no hay hover previo que avise.
    pantallaAngosta();
    const onRowClick = vi.fn();
    render(
      <DataTable columns={columnas()} rows={filas} getKey={(f) => f.id} onRowClick={onRowClick} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Abrir 1" }));

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("clickear la tarjeta sí abre la fila", async () => {
    pantallaAngosta();
    const onRowClick = vi.fn();
    render(
      <DataTable columns={columnas()} rows={filas} getKey={(f) => f.id} onRowClick={onRowClick} />,
    );

    await userEvent.click(screen.getByText("Pedido 1"));

    expect(onRowClick).toHaveBeenCalledWith(filas[0]);
  });

  it("el mensaje de lista vacía también aparece en tarjetas", () => {
    pantallaAngosta();
    render(<DataTable columns={columnas()} rows={[]} getKey={(f) => f.id} empty="No hay pedidos" />);

    expect(screen.getByText("No hay pedidos")).toBeInTheDocument();
  });
});

describe("Compatibilidad con las tablas que no declaran roles", () => {
  it("toma la primera columna como título", () => {
    // Las nueve pantallas de admin ya existían sin `rol`. Tenían que mejorar
    // sin tocarlas una por una.
    pantallaAngosta();
    const sinRoles: Column<Fila>[] = [
      { header: "Cliente", render: (f) => f.cliente },
      { header: "Total", render: (f) => f.total },
    ];
    render(<DataTable columns={sinRoles} rows={filas} getKey={(f) => f.id} />);

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    // "Cliente" fue absorbido como título: no se repite como etiqueta.
    expect(screen.queryByText("Cliente")).toBeNull();
    expect(screen.getAllByText("Total")).toHaveLength(2);
  });
});
