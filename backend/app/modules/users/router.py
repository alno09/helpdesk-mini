from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_admin
from app.models import User

from app.modules.users import service

from app.modules.users.schemas import (
    CreateUserRequest,
    UserResponse,
)


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get(
    "",
    response_model=list[UserResponse],
)
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):

    return service.list_business_users(
        db,
        admin.business_id,
    )


@router.post(
    "",
    response_model=UserResponse,
    status_code=201,
)
def create_user(
    data: CreateUserRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):

    try:
        return service.create_business_user(
            db,
            admin.business_id,
            data,
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email already exists",
        )