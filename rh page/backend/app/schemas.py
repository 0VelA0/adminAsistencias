from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=150)
    role: str = "employee"


class AttendanceInput(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_meters: float = Field(ge=0, le=10000)


class AttendanceOut(BaseModel):
    id: int
    kind: str
    recorded_at: datetime
    distance_meters: float
    accuracy_meters: float


class AttendanceAdminOut(AttendanceOut):
    user_name: str
    user_email: EmailStr


class QrOut(BaseModel):
    code: str
    expires_at: datetime


class QrAttendanceInput(AttendanceInput):
    station: str = Field(min_length=3, max_length=64)


TokenOut.model_rebuild()
