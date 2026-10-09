from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Business, User, UserRole

from app.core.security import (
    hash_password,
    verify_password,
    decode_token,
)

from app.modules.auth.schemas import RegisterBusinessRequest


def register_business(
    db: Session,
    data: RegisterBusinessRequest,
) -> tuple[Business, User]:

    business = Business(
        name=data.business_name.strip(),
        slug=data.business_slug,
    )

    db.add(business)
    db.flush()

    admin = User(
        business_id=business.id,
        name=data.name.strip(),
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        role=UserRole.admin,
    )

    db.add(admin)
    db.commit()

    db.refresh(business)
    db.refresh(admin)

    return business, admin


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User | None:

    user = db.scalar(
        select(User).where(
            User.email == email.lower()
        )
    )

    if user is None:
        return None

    if not verify_password(
        password,
        user.password_hash,
    ):
        return None

    return user


def get_user_from_refresh_token(
    db: Session,
    refresh_token: str,
) -> User | None:

    user_id = decode_token(
        refresh_token,
        expected_type="refresh",
    )

    return db.get(User, user_id)


def get_user_business(
    db: Session,
    user: User,
) -> Business | None:

    return db.get(
        Business,
        user.business_id,
    )