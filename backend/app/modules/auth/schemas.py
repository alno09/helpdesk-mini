from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.users.schemas import UserResponse


class RegisterBusinessRequest(BaseModel):
    business_name: str = Field(min_length=2, max_length=150)

    business_slug: str = Field(
        min_length=3,
        max_length=150,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )

    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class BusinessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str


class RegisterBusinessResponse(BaseModel):
    business: BusinessResponse
    admin: UserResponse


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    user: UserResponse
    business: BusinessResponse