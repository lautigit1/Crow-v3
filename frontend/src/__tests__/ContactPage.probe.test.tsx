import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { ContactPage } from "@/pages/contact/ContactPage";
import type { SiteSettings } from "@/entities/settings";

const SETTINGS: SiteSettings = {
  company_name: "Crow Repuestos",
  phone_display: "261 660-0569",
  whatsapp_number: "5492616600569",
  email: "crowrepuestos@gmail.com",
  address: "Suipacha 41 Procrear Ciudad Torre OPQ Local 5",
  hours: "Lun–Sáb · 8:00–18:00",
  instagram: "",
  facebook: "",
  tiktok: "",
};

const server = setupServer(
  http.get("*/settings", () => HttpResponse.json(SETTINGS)),
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ContactPage probe", () => {
  it("renderiza los datos de contacto", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ContactPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // eslint-disable-next-line no-console
    console.log(document.body.innerHTML.slice(0, 4000));
    expect(await screen.findByText("crowrepuestos@gmail.com")).toBeTruthy();
  });
});
