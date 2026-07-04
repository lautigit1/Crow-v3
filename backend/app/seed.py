"""Minimal seed: admin user + one demo product (both idempotent)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product
from app.models.user import User, UserRole


def _seed_admin(db: Session) -> None:
    if not db.scalar(select(User).where(User.email == settings.SEED_ADMIN_EMAIL)):
        db.add(User(
            full_name="Administrador",
            email=settings.SEED_ADMIN_EMAIL,
            hashed_password=hash_password(settings.SEED_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
        ))
        db.commit()
        print(f"✓ Admin creado: {settings.SEED_ADMIN_EMAIL}")
    else:
        print(f"→ Admin ya existe: {settings.SEED_ADMIN_EMAIL}")


def _seed_demo_product(db: Session) -> None:
    """Crea un producto de ejemplo solo si la tabla products está vacía.

    No pisa catálogos reales -- si ya hay al menos un producto cargado
    (a mano, importado, o de un deploy anterior), no hace nada.
    """
    if db.scalar(select(Product).limit(1)):
        print("→ Ya hay productos cargados, no se crea el producto de prueba")
        return

    category = db.scalar(select(Category).where(Category.slug == "filtros"))
    if not category:
        category = Category(
            name="Filtros",
            slug="filtros",
            description="Filtros de aceite, aire, combustible y cabina.",
        )
        db.add(category)
        db.flush()

    brand = db.scalar(select(Brand).where(Brand.slug == "bosch"))
    if not brand:
        brand = Brand(name="Bosch", slug="bosch")
        db.add(brand)
        db.flush()

    db.add(Product(
        name="Filtro de Aceite Bosch Premium",
        sku="FILT-BOS-001",
        description=(
            "Filtro de aceite de alta eficiencia para motores nafteros y diesel. "
            "Elemento filtrante de papel plisado, válvula anti-retorno y junta de "
            "goma resistente a altas temperaturas. Compatible con la mayoría de "
            "autos y camionetas de uso particular."
        ),
        price=8500,
        stock=24,
        image_url="https://picsum.photos/seed/crow-filtro-bosch/800/800",
        vehicle_type="Autos",
        is_featured=True,
        category_id=category.id,
        brand_id=brand.id,
    ))
    db.commit()
    print("✓ Producto de prueba creado: Filtro de Aceite Bosch Premium")


def seed(db: Session) -> None:
    _seed_admin(db)
    _seed_demo_product(db)


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
