# Design: cloudinary-image-upload

## Backend

### 1. Settings (`backend/app/core/config.py`)

```python
# ── Media uploads (Cloudinary) ───────────────────────────────────────────
CLOUDINARY_CLOUD_NAME: str = ""
CLOUDINARY_API_KEY: str = ""
CLOUDINARY_API_SECRET: str = ""

@property
def cloudinary_configured(self) -> bool:
    return bool(self.CLOUDINARY_CLOUD_NAME and self.CLOUDINARY_API_KEY and self.CLOUDINARY_API_SECRET)
```

Todas vacías por default — la feature es opcional, no rompe instalaciones
existentes que no la configuren.

### 2. Firma de subida (`backend/app/core/cloudinary_sign.py`, nuevo)

Cloudinary firma un signed upload con SHA-1 sobre los parámetros ordenados
alfabéticamente + el secreto, documentado en su API pública. No hace falta
el SDK oficial:

```python
import hashlib
import time

def build_signature(params: dict[str, str], api_secret: str) -> str:
    to_sign = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    return hashlib.sha1(f"{to_sign}{api_secret}".encode("utf-8")).hexdigest()

def new_signed_upload(*, cloud_name: str, api_key: str, api_secret: str, folder: str) -> dict:
    timestamp = str(int(time.time()))
    params = {"timestamp": timestamp, "folder": folder}
    signature = build_signature(params, api_secret)
    return {
        "cloud_name": cloud_name,
        "api_key": api_key,
        "timestamp": timestamp,
        "folder": folder,
        "signature": signature,
    }
```

Solo se firman `timestamp` y `folder` — son los únicos parámetros que
viajan al POST de Cloudinary además de `file` y `api_key` (que no se firman).

### 3. Endpoint (`backend/app/api/routes/uploads.py`, nuevo)

```python
from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.cloudinary_sign import new_signed_upload
from app.core.deps import AdminUser

router = APIRouter()

_FOLDER = "crow-repuestos/products"


@router.get("/cloudinary-signature")
def get_cloudinary_signature(_: AdminUser) -> dict:
    if not settings.cloudinary_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Cloudinary no está configurado. Seteá CLOUDINARY_CLOUD_NAME, "
                "CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET."
            ),
        )
    return new_signed_upload(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        folder=_FOLDER,
    )
```

Registrar en `backend/app/api/__init__.py`:
```python
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
```

### 4. `.env.example`

```
# ── Media uploads (Cloudinary, opcional) ──────────────────────────────────
# Dejar vacío para deshabilitar el upload de imágenes (el form admin cae al
# campo de URL manual). Conseguí las credenciales en cloudinary.com/console.
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 5. Tests (`backend/tests/test_uploads.py`, nuevo)

- `test_requires_admin` — usuario normal → 403
- `test_requires_auth` — sin sesión → 401
- `test_returns_503_when_not_configured` — con `CLOUDINARY_CLOUD_NAME=""` (default) → 503
- `test_returns_signed_params_when_configured` — monkeypatch de `settings` con
  credenciales dummy, valida que `signature` sea el SHA-1 esperado calculado
  a mano en el test (no se llama a la API real de Cloudinary).

---

## Frontend

### 1. Cliente de upload (`frontend/src/entities/upload/api.ts`, nuevo)

```typescript
import { api } from "@/shared/api/client";

type CloudinarySignature = {
  cloud_name: string;
  api_key: string;
  timestamp: string;
  folder: string;
  signature: string;
};

export const uploadApi = {
  uploadProductImage: async (file: File): Promise<string> => {
    const { data: sig } = await api.get<CloudinarySignature>("/uploads/cloudinary-signature");

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.api_key);
    form.append("timestamp", sig.timestamp);
    form.append("folder", sig.folder);
    form.append("signature", sig.signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error("No se pudo subir la imagen a Cloudinary");
    const json = await res.json();
    return json.secure_url as string;
  },
};
```

No pasa por nuestro `api` axios instance para el POST a Cloudinary (dominio
externo, no lleva cookies de sesión) — solo el `GET` de la firma usa el
cliente axios existente.

### 2. `AdminProductsPage.tsx` — reemplazo de la Fila 5

Se agrega estado `uploading: boolean` y un file input oculto + botón. Se
mantiene el campo de URL manual como fallback y se agrega preview con
`ProductImage` (componente ya existente, no requiere cambios).

```tsx
const [uploading, setUploading] = useState(false);

async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    setError("La imagen no puede superar los 5 MB.");
    return;
  }
  setUploading(true);
  setError("");
  try {
    const url = await uploadApi.uploadProductImage(file);
    set({ image_url: url });
  } catch {
    setError("No se pudo subir la imagen. Probá de nuevo o pegá una URL manualmente.");
  } finally {
    setUploading(false);
    e.target.value = "";
  }
}
```

Layout de la fila: preview (thumbnail 56x56 con `ProductImage`) + input de
URL manual + botón "Subir imagen" (dispara un `<input type="file" hidden>`).
Validación client-side: `accept="image/*"`, límite de 5MB antes de llamar a
Cloudinary (evita gastar el round-trip si el archivo es obviamente inválido).
