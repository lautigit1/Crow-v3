from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_id: int | None = None
    actor_email: str | None = None
    action: str
    entity: str | None = None
    entity_id: str | None = None
    detail: str | None = None
    ip_address: str | None = None
    created_at: datetime


class AuditLogList(BaseModel):
    items: list[AuditLogRead]
    total: int
