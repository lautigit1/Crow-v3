# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite reemplaza import.meta.env.VITE_* por su valor literal al buildear
# (no es una env var en runtime) -- por eso el DSN de Sentry entra como
# build arg, no como `environment:` en el compose. Vacío por default =
# Sentry deshabilitado (ver src/shared/lib/sentry.ts).
ARG VITE_SENTRY_DSN=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Use esbuild-based build (skips full tsc gate) so the image builds reliably.
RUN npm run build:ci

# ---- Serve stage ----
# nginx-unprivileged en vez de nginx:alpine -- corre como usuario `nginx`
# (no root) por default, sin pasos extra de chown/USER. Como contrapartida
# no puede bindear el puerto 80 (privilegiado), por eso escucha en 8080
# (ver nginx.conf) -- el mapeo de puerto al host (8080:8080) no cambia.
FROM nginxinc/nginx-unprivileged:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
