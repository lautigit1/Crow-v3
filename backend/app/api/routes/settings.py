from fastapi import APIRouter, Request
from sqlalchemy import select

from app.core import audit
from app.core.deps import AdminUser, DbSession
from app.models.setting import Setting
from app.schemas.setting import DEFAULT_SETTINGS, SiteSettings, SiteSettingsUpdate

router = APIRouter()


def _current(db: DbSession) -> dict[str, str]:
    merged = dict(DEFAULT_SETTINGS)
    for row in db.scalars(select(Setting)).all():
        merged[row.key] = row.value
    return merged


@router.get("", response_model=SiteSettings)
def get_settings(db: DbSession) -> SiteSettings:
    """Public: the live site configuration (defaults overridden by stored rows)."""
    return SiteSettings(**_current(db))


@router.put("", response_model=SiteSettings)
def update_settings(data: SiteSettingsUpdate, db: DbSession, admin: AdminUser, request: Request) -> SiteSettings:
    changes = data.model_dump(exclude_unset=True)
    for key, value in changes.items():
        row = db.get(Setting, key)
        if row:
            row.value = value
        else:
            db.add(Setting(key=key, value=value))
    db.flush()
    audit.record(db, action="settings.update", actor=admin, entity="settings", detail=", ".join(changes.keys()) or None, request=request)
    return SiteSettings(**_current(db))
