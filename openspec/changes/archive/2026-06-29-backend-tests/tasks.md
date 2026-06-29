# Tasks: backend-tests

## Status: done

- [x] Auditar tests existentes y conftest
- [x] Fix test_quotes.py (2 tests rotos por quotes-pagination)
- [x] Agregar fixture `supplier` a conftest.py
- [x] Crear test_categories.py (14 tests)
- [x] Crear test_brands.py (14 tests)
- [x] Crear test_suppliers.py (17 tests)
- [x] Crear test_users.py (17 tests)
- [x] Crear test_dashboard.py (13 tests)
- [x] Revisión estática — validate_password_strength lanza 422 ✓, delete self protegido ✓
- [x] Archivar change

Nota: pytest no disponible en sandbox (red bloqueada). Ejecutar con:
  cd backend && pytest tests/ -v
