from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(
        min_length=2,
        max_length=150,
    )
    role: str = "employee"

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in {"employee", "admin"}:
            raise ValueError("El rol debe ser employee o admin.")
        return value


class AttendanceInput(BaseModel):
    latitude: float = Field(
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ge=-180,
        le=180,
    )

    accuracy_meters: float = Field(
        ge=0,
        le=10000,
    )


class AttendanceOut(BaseModel):
    id: int
    kind: str
    work_date: date
    recorded_at: datetime
    distance_meters: float
    accuracy_meters: float
    source: str
    status: str
    note: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class AttendanceAdminOut(AttendanceOut):
    user_name: str
    user_email: EmailStr


class ManualAttendanceInput(BaseModel):
    user_id: int

    kind: str

    work_date: date

    recorded_at: datetime

    status: str = "normal"

    note: str | None = Field(
        default=None,
        max_length=500,
    )

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, value: str) -> str:
        if value not in {"entry", "exit"}:
            raise ValueError("kind debe ser entry o exit.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in {"normal", "late"}:
            raise ValueError("status debe ser normal o late.")
        return value


class AttendanceTodayOut(BaseModel):
    work_date: date
    entry: AttendanceOut | None = None
    exit: AttendanceOut | None = None
    is_on_vacation: bool = False


class QrOut(BaseModel):
    code: str
    expires_at: datetime


class QrAttendanceInput(AttendanceInput):
    station: str = Field(
        min_length=3,
        max_length=64,
    )


# ---------------------------------------------------------
# VACACIONES
# ---------------------------------------------------------


class VacationRequestCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str | None = Field(
        default=None,
        max_length=500,
    )

    @field_validator("end_date")
    @classmethod
    def validate_dates(
        cls,
        value: date,
        info,
    ) -> date:
        start_date = info.data.get("start_date")

        if start_date and value < start_date:
            raise ValueError(
                "La fecha final no puede ser anterior a la fecha inicial."
            )

        return value


class VacationRequestOut(BaseModel):
    id: int
    user_id: int
    start_date: date
    end_date: date
    status: str
    request_type: str
    reason: str | None = None
    admin_note: str | None = None
    reviewed_by_id: int | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class VacationRequestAdminOut(VacationRequestOut):
    user_name: str
    user_email: EmailStr


class VacationReviewInput(BaseModel):
    admin_note: str | None = Field(
        default=None,
        max_length=500,
    )


class PermissionRequestCreate(BaseModel):
    kind: str
    start_date: date
    end_date: date
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, value: str) -> str:
        if value not in {"paid", "unpaid"}:
            raise ValueError("kind debe ser paid o unpaid.")
        return value

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, value: date, info) -> date:
        start_date = info.data.get("start_date")

        if start_date and value < start_date:
            raise ValueError(
                "La fecha final no puede ser anterior a la fecha inicial."
            )

        return value


class PermissionRequestOut(BaseModel):
    id: int
    user_id: int
    kind: str
    start_date: date
    end_date: date
    reason: str
    status: str
    admin_note: str | None = None
    reviewed_by_id: int | None = None
    reviewed_by_name: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PermissionRequestAdminOut(PermissionRequestOut):
    user_name: str
    user_email: EmailStr


class PermissionReviewInput(BaseModel):
    admin_note: str | None = Field(default=None, max_length=500)

class AdminVacationCreate(BaseModel):
    user_id: int
    start_date: date
    end_date: date

    reason: str | None = Field(
        default=None,
        max_length=500,
    )

    admin_note: str | None = Field(
        default=None,
        max_length=500,
    )

    @field_validator("end_date")
    @classmethod
    def validate_dates(
        cls,
        value: date,
        info,
    ) -> date:
        start_date = info.data.get("start_date")

        if start_date and value < start_date:
            raise ValueError(
                "La fecha final no puede ser anterior a la fecha inicial."
            )

        return value


TokenOut.model_rebuild()