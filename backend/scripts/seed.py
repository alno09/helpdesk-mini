import os

from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import DATABASE_URL
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import Business, User, UserRole


# ============================================================
# CONFIGURATION
# ============================================================

DEMO_PASSWORD = "DemoPass123!"

DEMO_BUSINESSES = (
    {
        "name": "Demo Coffee",
        "slug": "demo-coffee",
        "users": (
            (
                "Coffee Admin",
                "coffee.admin@example.com",
                UserRole.admin,
            ),
            (
                "Coffee Agent",
                "coffee.agent@example.com",
                UserRole.agent,
            ),
            (
                "Coffee Customer 1",
                "coffee.customer1@example.com",
                UserRole.customer,
            ),
            (
                "Coffee Customer 2",
                "coffee.customer2@example.com",
                UserRole.customer,
            ),
        ),
    },
    {
        "name": "Demo Hotel",
        "slug": "demo-hotel",
        "users": (
            (
                "Hotel Admin",
                "hotel.admin@example.com",
                UserRole.admin,
            ),
            (
                "Hotel Agent",
                "hotel.agent@example.com",
                UserRole.agent,
            ),
            (
                "Hotel Customer 1",
                "hotel.customer1@example.com",
                UserRole.customer,
            ),
            (
                "Hotel Customer 2",
                "hotel.customer2@example.com",
                UserRole.customer,
            ),
        ),
    },
)


# ============================================================
# BUSINESS SEED
# ============================================================

def get_or_create_business(
    db: Session,
    name: str,
    slug: str,
) -> Business:

    business = db.scalar(
        select(Business).where(
            Business.slug == slug
        )
    )

    if business is not None:
        return business

    business = Business(
        name=name,
        slug=slug,
    )

    db.add(business)
    db.flush()

    return business


# ============================================================
# USER SEED
# ============================================================

def get_or_create_user(
    db: Session,
    business: Business,
    name: str,
    email: str,
    role: UserRole,
) -> User:

    user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if user is not None:
        if (
            user.business_id != business.id
            or user.role != role
        ):
            raise ValueError(
                f"Conflicting demo user: {email}"
            )

        return user

    user = User(
        business_id=business.id,
        name=name,
        email=email,
        password_hash=hash_password(DEMO_PASSWORD),
        role=role,
    )

    db.add(user)
    db.flush()

    return user


# ============================================================
# SEED EXECUTION
# ============================================================

def seed() -> None:

    if os.getenv("SEED_DEMO") != "1":
        raise RuntimeError(
            "Set SEED_DEMO=1 to explicitly enable demo seeding."
        )

    database_name = make_url(DATABASE_URL).database

    if database_name != "helpdesk":
        raise RuntimeError(
            "Demo seeding is restricted to the helpdesk "
            f"development database. Current: {database_name}"
        )

    print("Starting demo database seed...")

    with SessionLocal.begin() as db:

        for business_data in DEMO_BUSINESSES:

            business = get_or_create_business(
                db,
                business_data["name"],
                business_data["slug"],
            )

            for name, email, role in business_data["users"]:

                get_or_create_user(
                    db,
                    business,
                    name,
                    email,
                    role,
                )

    print("Demo seed completed successfully.")
    print("Businesses: 2")
    print("Demo users: 8")
    print(f"Demo password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed()