from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user

from app.core.security import (
    create_access_token,
    create_refresh_token,
)

from app.models import User

from app.modules.auth import service

from app.modules.auth.schemas import (
    RegisterBusinessRequest,
    RegisterBusinessResponse,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    AccessTokenResponse,
    MeResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register-business",
    response_model=RegisterBusinessResponse,
    status_code=201,
)
def register_business(
    data: RegisterBusinessRequest,
    db: Session = Depends(get_db),
):

    try:
        business, admin = service.register_business(
            db,
            data,
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Business slug or email already exists",
        )

    return {
        "business": business,
        "admin": admin,
    }


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):

    user = service.authenticate_user(
        db,
        data.email,
        data.password,
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
)
def refresh_token(
    data: RefreshRequest,
    db: Session = Depends(get_db),
):

    user = service.get_user_from_refresh_token(
        db,
        data.refresh_token,
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User no longer exists",
        )

    return AccessTokenResponse(
        access_token=create_access_token(user.id),
    )


@router.get(
    "/me",
    response_model=MeResponse,
)
def get_me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    business = service.get_user_business(
        db,
        user,
    )

    if business is None:
        raise HTTPException(
            status_code=404,
            detail="Business not found",
        )

    return {
        "user": user,
        "business": business,
    }