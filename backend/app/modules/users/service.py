from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User, UserRole
from app.core.security import hash_password

from app.modules.users.schemas import CreateUserRequest


def list_business_users(
    db: Session,
    business_id: int,
) -> list[User]:

    return list(
        db.scalars(
            select(User)
            .where(User.business_id == business_id)
            .order_by(User.created_at.desc())
        ).all()
    )


def create_business_user(
    db: Session,
    business_id: int,
    data: CreateUserRequest,
) -> User:

    user = User(
        business_id=business_id,
        name=data.name.strip(),
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        role=UserRole(data.role),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user