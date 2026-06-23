import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class QuoteStatus(str, enum.Enum):
    NUEVA = "Nueva"
    EN_REVISION = "En revisión"
    RESPONDIDA = "Respondida"
    FINALIZADA = "Finalizada"


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(120))
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    vehicle: Mapped[str | None] = mapped_column(String(160), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[QuoteStatus] = mapped_column(Enum(QuoteStatus), default=QuoteStatus.NUEVA, nullable=False)

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
