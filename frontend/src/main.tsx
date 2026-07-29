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
import "@fontsource/unbounded/700.css";
import "@fontsource/unbounded/800.css";
import "@fontsource/unbounded/900.css";
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
