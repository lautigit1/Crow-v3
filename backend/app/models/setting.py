from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Setting(Base):
    """Simple key/value store for editable site configuration."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
