# Proposal: eslint-fsd-ruff-ci-gates

## What

Hallazgo "Alta" #11 de la auditoría técnica del 2026-07-13: agregar ESLint + reglas de arquitectura Feature-Sliced Design (FSD) en el frontend, y ruff en el backend, ambos bloqueantes en CI.

## Why

Ninguno de los dos linters existía en el repo. Sin un gate de CI, cualquier problema de calidad de código (imports sin usar, variables ambiguas, excepciones sin `from`, violaciones de la arquitectura por capas que el equipo ya sigue de facto en `frontend/src`) solo se detecta en review manual, si es que se detecta.

## Non-goals

- No se hace una migración completa a la estructura de segmentos (`ui/model/api/lib`) que Steiger recomienda para cada slice — el repo usa consistentemente slices "planas" (un puñado de archivos por slice, sin subcarpetas de segmento) en sus ~35 slices, y reestructurar todas de una vez es un cambio grande y riesgoso fuera de alcance de este hallazgo puntual.
- No se corrige toda la deuda de estilo preexistente que un linter nuevo podría señalar de forma agresiva — se eligió un set de reglas conservador para ambos linters (ver design.md) que sí se cumple al 100% hoy, en vez de dejar cientos de warnings sin resolver desde el día uno.

## Success criteria

- `npm run lint` (ESLint + Steiger) corre en el frontend con 0 errores.
- `ruff check .` corre en el backend con 0 errores.
- Ambos comandos están wireados como steps bloqueantes en `.github/workflows/frontend.yml` y `backend.yml` respectivamente (`npm run lint` antes de tests/build; `ruff check .` antes de pytest).
- La suite completa de tests sigue pasando sin regresiones (vitest 76/76, pytest 249/249).
- El build de producción (`npm run build:ci`) sigue generando los mismos chunks separados por página de admin (code-splitting intacto).
