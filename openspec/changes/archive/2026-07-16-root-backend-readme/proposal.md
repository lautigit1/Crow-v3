# Proposal: root-backend-readme

## What

Hallazgo "Alta" #13 de la auditoría técnica del 2026-07-13: no existía un `README.md` en la raíz del repo, y `backend/README.md` estaba desactualizado (mencionaba `python-jose`/`passlib`, no listaba los módulos de rutas ni los modelos reales, tenía un healthcheck path incorrecto y una función inexistente citada).

## Why

Sin un README raíz, alguien nuevo en el repo no tiene un punto de entrada único que explique qué es el proyecto, cómo levantar el stack completo, y a dónde ir para cada pieza de documentación (backend, deploy, contribución). `backend/README.md` desactualizado es peor que no tenerlo: documenta cosas que ya no son ciertas (dependencias reemplazadas en la migración PyJWT de este mismo día, healthcheck en la ruta vieja).

## Non-goals

- No se documentó variable por variable cada env var (eso ya vive en `.env.example` y `DEPLOY.md`).
- No se generó documentación de API detallada (eso lo cubre Swagger en `/docs`, ya referenciado).

## Success criteria

- `README.md` en la raíz: overview del proyecto, stack real, cómo levantar todo con `docker compose up --build`, estructura del repo, comandos de lint/test, links a `backend/README.md`/`DEPLOY.md`/`CONTRIBUTING.md`/`openspec/`.
- `backend/README.md` actualizado: stack real (Redis, ruff), estructura de directorios real, sección de 11 modelos, sección de 14 módulos de rutas, healthcheck correcto (`/api/health`), tabla de endpoints ampliada a todos los módulos, sin referencias a funciones/dependencias inexistentes.
