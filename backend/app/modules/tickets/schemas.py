from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator
)

from app.models.enums import (
    TicketPriority,
    TicketStatus,
    UserRole
)

class CreateTicketRequest(BaseModel):
    subject: str = Field(min_length=3, max_length=255)
    category: str = Field(min_length=2, max_length=100)
    priority: TicketPriority

    message: str = Field(min_length=1, max_length=5000)

class UpdateTicketRequest(BaseModel):
    status: TicketStatus | None = None

    assigned_agent_id: int | None = Field(
        default=None,
        ge=1,
    )

    take: bool = False

    @model_validator(mode="after")
    def validate_operation(self):
        operations = [
            self.status is not None,
            self.assigned_agent_id is not None,
            self.take is True,
        ]

        if sum(operations) != 1:
            raise ValueError(
                "Exactly one operation is required"
            )

        return self

class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_id: int
    customer_id: int
    assigned_agent_id: int | None

    subject: str
    category: str

    priority: TicketPriority
    status: TicketStatus

    created_at: datetime
    updated_at: datetime

class MessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_id: int

    sender_name: str
    sender_role: UserRole

    body: str
    created_at: datetime