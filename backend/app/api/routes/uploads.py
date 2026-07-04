from fastapi import APIRouter, HTTPException, status

from app.core.cloudinary_sign import new_signed_upload
from app.core.config import settings
from app.core.deps import AdminUser

router = APIRouter()

_FOLDER = "crow-repuestos/products"


@router.get("/cloudinary-signature")
def get_cloudinary_signature(_: AdminUser) -> dict:
    """Admin-only: short-lived signed params for a direct browser -> Cloudinary upload.

    The image bytes never pass through our server -- the frontend POSTs
    directly to Cloudinary's REST API with these params, then saves the
    returned `secure_url` as the product's image_url.
    """
    if not settings.cloudinary_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Cloudinary no esta configurado. Setea CLOUDINARY_CLOUD_NAME, "
                "CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET."
            ),
        )
    return new_signed_upload(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        folder=_FOLDER,
    )
