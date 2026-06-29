from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.deps import CurrentUser, DbSession
from app.models.favorite import UserFavorite
from app.models.product import Product
from app.schemas.favorite import FavoriteList

router = APIRouter()


@router.get("", response_model=FavoriteList)
def list_favorites(current_user: CurrentUser, db: DbSession) -> FavoriteList:
    """Devuelve los IDs de productos favoritos del usuario autenticado."""
    rows = db.scalars(
        select(UserFavorite.product_id).where(UserFavorite.user_id == current_user.id)
    ).all()
    return FavoriteList(product_ids=list(rows), total=len(rows))


@router.post("/{product_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(product_id: int, current_user: CurrentUser, db: DbSession) -> dict:
    """Agrega un producto a favoritos. Idempotente."""
    product = db.get(Product, product_id)
    if product is None or product.is_deleted:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    fav = UserFavorite(user_id=current_user.id, product_id=product_id)
    db.add(fav)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # Ya existe — idempotente, no error

    return {"product_id": product_id}


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(product_id: int, current_user: CurrentUser, db: DbSession) -> None:
    """Elimina un producto de favoritos."""
    fav = db.scalar(
        select(UserFavorite).where(
            UserFavorite.user_id == current_user.id,
            UserFavorite.product_id == product_id,
        )
    )
    if fav is not None:
        db.delete(fav)
        db.commit()
