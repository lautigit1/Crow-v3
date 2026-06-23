from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, select

from app.core import audit
from app.core.deps import AdminUser, CurrentUser, DbSession
from app.core.passwords import validate_password_strength
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import PaginatedUsers, PasswordChange, UserAdminUpdate, UserRead, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserRead)
def get_profile(current_user: CurrentUser) -> User:
    return current_user


@router.patch("/me", response_model=UserRead)
def update_profile(data: UserUpdate, current_user: CurrentUser, db: DbSession, request: Request) -> User:
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(current_user, field, value)
    db.add(current_user)
    db.flush()
    db.refresh(current_user)
    audit.record(
        db,
        action="user.profile_update",
        actor=current_user,
        entity="user",
        entity_id=current_user.id,
        detail=", ".join(changes.keys()) or None,
        request=request,
    )
    return current_user


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(data: PasswordChange, current_user: CurrentUser, db: DbSession, request: Request) -> None:
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contraseña actual incorrecta")
    validate_password_strength(data.new_password)
    current_user.hashed_password = hash_password(data.new_password)
    db.add(current_user)
    db.flush()
    audit.record(db, action="user.password_change", actor=current_user, entity="user", entity_id=current_user.id, request=request)


# ---------------------------------------------------------------------------
# Admin only
# ---------------------------------------------------------------------------

@router.get("", response_model=PaginatedUsers)
def list_users(
    db: DbSession,
    _: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> PaginatedUsers:
    total = db.scalar(select(func.count()).select_from(User)) or 0
    users = list(
        db.scalars(select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)).all()
    )
    return PaginatedUsers(items=users, total=total)


@router.patch("/{user_id}", response_model=UserRead)
def admin_update_user(
    user_id: int, data: UserAdminUpdate, db: DbSession, admin: AdminUser, request: Request
) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    if "role" in data.model_fields_set and user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes cambiar tu propio rol")
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(user, field, value)
    db.add(user)
    db.flush()
    db.refresh(user)
    audit.record(
        db,
        action="user.admin_update",
        actor=admin,
        entity="user",
        entity_id=user.id,
        detail=", ".join(f"{k}={v}" for k, v in changes.items()) or None,
        request=request,
    )
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(user_id: int, db: DbSession, admin: AdminUser, request: Request) -> None:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes eliminar tu propia cuenta")
    audit.record(db, action="user.delete", actor=admin, entity="user", entity_id=user.id, detail=user.email, request=request)
    db.delete(user)
    db.flush()
