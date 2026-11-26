import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { CartProvider } from "@/app/providers/CartProvider";
import { FavoritesProvider } from "@/app/providers/FavoritesProvider";
import { ErrorBoundary } from "@/app/providers/ErrorBoundary";
import { ServerEventsProvider } from "@/app/providers/ServerEventsProvider";
import { queryClient } from "@/app/providers/queryClient";
import { App } from "@/app/App";
import { initSentry } from "@/shared/lib/sentry";
// Self-hosted fonts — bundled with the app, no Google Fonts dependency at runtime
// Unbounded: 500 para todos los títulos, 700 solo para cifras (precios,
// métricas del panel). 800/900 se dejaron de cargar a propósito: la jerarquía
// sale del tamaño y del espacio, no de engrosar la letra. Un `font-extrabold`
// que quede suelto cae a 700, el peso cargado más cercano.
import "@fontsource/unbounded/500.css";
import "@fontsource/unbounded/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/fira-mono/400.css";
import "@fontsource/fira-mono/500.css";
import "@/app/styles/index.css";

initSentry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            {/* Dentro de AuthProvider: la conexión solo se abre cuando hay
                sesión, y se cierra al cerrarla. */}
            <ServerEventsProvider>
              <CartProvider>
                <FavoritesProvider>
                  <App />
                </FavoritesProvider>
              </CartProvider>
            </ServerEventsProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
