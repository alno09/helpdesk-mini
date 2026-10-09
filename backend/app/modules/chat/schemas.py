from typing import Literal

from pydantic import BaseModel, Field, field_validator


class SendMessageEvent(BaseModel):
    type: Literal["message.send"]

    body: str = Field(
        min_length=1,
        max_length=5000,
    )

    @field_validator("body", mode="before")
    @classmethod
    def normalize_body(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip()

        return value