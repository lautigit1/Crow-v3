# Apply: ci-cd-github-actions

## Archivos creados

- `.github/workflows/ci.yml` — pipeline completo de CI

## Pipeline implementado

```
push/PR a main o develop
├── backend-tests
│   ├── Python 3.12
│   ├── PostgreSQL 16 (service container)
│   ├── pip install requirements-dev.txt
│   └── pytest tests/ -v
└── frontend-checks
    ├── Node 20
    ├── npm ci
    ├── tsc --noEmit
    └── npm test -- --run
```

## Desviaciones del plan

- `requirements-dev.txt` no incluía `fastapi` ni `uvicorn` — solo tenía las
  dependencias de test. Se agregaron al archivo para que el job de CI pudiera
  importar la app. (Fix separado aplicado en el mismo ciclo.)
- `package-lock.json` estaba desincronizado con `package.json` — `npm ci`
  fallaba. Regenerado con `npm install`. (Fix separado aplicado en el mismo ciclo.)
- Errores de TypeScript encontrados y corregidos para que `tsc --noEmit` pasara.
