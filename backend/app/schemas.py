from datetime import date, datetime, timedelta

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator, model_validator

def count_workdays(start: date, end: date) -> int:
    """Días laborables (lunes a viernes) entre dos fechas, ambas incluidas."""

    if end < start:
        return 0

    return sum(
        1
        for i in range((end - start).days + 1)
        if (start + timedelta(days=i)).weekday() < 5
    )


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
    hire_date: date | None = None

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
    status: str | None = None  # None = calcular según el horario
    note: str | None = Field(default=None, max_length=500)

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, value: str) -> str:
        if value not in {"entry", "exit"}:
            raise ValueError("kind debe ser entry o exit.")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in {"normal", "late"}:
            raise ValueError("status debe ser normal o late.")
        return value


class AttendanceEdit(BaseModel):
    recorded_at: datetime | None = None
    status: str | None = None
    note: str | None = Field(default=None, max_length=500)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in {"normal", "late"}:
            raise ValueError("status debe ser normal o late.")
        return value


class AttendanceAdminOut(AttendanceOut):
    user_id: int
    user_name: str
    user_email: EmailStr


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
    reviewed_by_name: str | None = None

    @computed_field
    @property
    def days(self) -> int:
        return count_workdays(self.start_date, self.end_date)
    
    model_config = ConfigDict(
        from_attributes=True,
    )
    
class VacationBalanceOut(BaseModel):
    year: int
    total_days: int
    used_days: int
    pending_days: int
    available_days: int

class VacationRequestAdminOut(VacationRequestOut):
    user_name: str
    user_email: EmailStr


class VacationReviewInput(BaseModel):
    admin_note: str | None = Field(
        default=None,
        max_length=500,
    )

class HolidayIn(BaseModel):
    holiday_date: date
    name: str = Field(min_length=2, max_length=120)


class HolidayOut(BaseModel):
    id: int
    holiday_date: date
    name: str

    model_config = ConfigDict(from_attributes=True)

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

##UserSettings
class ProfileOut(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    phone: str | None = Field(default=None, max_length=30)


class NotificationSettings(BaseModel):
    notify_attendance: bool
    notify_vacations: bool
    notify_permissions: bool
    notify_company: bool
    notify_weekly: bool

    model_config = ConfigDict(from_attributes=True)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

class TodayEntryOut(BaseModel):
    user: UserOut
    entry_at: datetime
    exit_at: datetime | None = None
    status: str


class TodayAbsenceOut(BaseModel):
    user: UserOut
    start_date: date
    end_date: date
    kind: str | None = None  # paid | unpaid, solo en permisos


class TodayOverviewOut(BaseModel):
    work_date: date
    is_workday: bool
    late_limit: str
    limit_passed: bool
    registered: list[TodayEntryOut]
    missing: list[UserOut]
    on_vacation: list[TodayAbsenceOut]
    on_permission: list[TodayAbsenceOut]
    holiday_name: str | None = None

class UserCreatedOut(UserOut):
    temporary_password: str


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    role: str | None = None
    is_active: bool | None = None
    hire_date: date | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str | None) -> str | None:
        if value is not None and value not in {"employee", "admin"}:
            raise ValueError("El rol debe ser employee o admin.")
        return value



class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    role: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    hire_date: date | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str | None) -> str | None:
        if value is not None and value not in {"employee", "admin"}:
            raise ValueError("El rol debe ser employee o admin.")
        return value

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    hire_date: date | None = None
    avatar: str | None = None

    model_config = ConfigDict(from_attributes=True)

class AvatarInput(BaseModel):
    avatar: str = Field(max_length=400_000)


HEX_COLOR = r"^#[0-9a-fA-F]{6}$"


class BrandingOut(BaseModel):
    company_name: str
    logo: str | None = None
    primary_color: str
    sidebar_color: str

    model_config = ConfigDict(from_attributes=True)


class BrandingUpdate(BaseModel):
    company_name: str = Field(min_length=2, max_length=120)
    primary_color: str = Field(pattern=HEX_COLOR)
    sidebar_color: str = Field(pattern=HEX_COLOR)

class NotificationOut(BaseModel):
    id: int
    kind: str
    title: str
    body: str
    page: str
    created_at: datetime
    read_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationsOut(BaseModel):
    items: list[NotificationOut]
    unread: int

HHMM = r"^([01]\d|2[0-3]):[0-5]\d$"


def to_minutes(value: str) -> int:
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def to_hhmm(total: int) -> str:
    return f"{total // 60:02d}:{total % 60:02d}"


class SpaceIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    kind: str = Field(min_length=2, max_length=60)
    capacity: int = Field(ge=1, le=1000)
    location: str | None = Field(default=None, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    equipment: list[str] = Field(default_factory=list, max_length=20)
    open_time: str = Field(pattern=HHMM)
    close_time: str = Field(pattern=HHMM)
    open_days: list[int] = Field(min_length=1)
    is_active: bool = True

    @field_validator("equipment")
    @classmethod
    def clean_equipment(cls, value: list[str]) -> list[str]:
        items = [item.strip() for item in value if item.strip()]

        if any(len(item) > 40 for item in items):
            raise ValueError("Cada elemento del equipamiento admite hasta 40 caracteres.")

        return items

    @field_validator("open_days")
    @classmethod
    def valid_days(cls, value: list[int]) -> list[int]:
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("Los días van de 0 (lunes) a 6 (domingo).")

        return sorted(set(value))

    @model_validator(mode="after")
    def valid_hours(self):
        if to_minutes(self.close_time) <= to_minutes(self.open_time):
            raise ValueError("La hora de cierre debe ser posterior a la de apertura.")

        return self


class SpaceOut(SpaceIn):
    id: int


class BookingIn(BaseModel):
    space_id: int
    booking_date: date
    start_time: str = Field(pattern=HHMM)
    end_time: str = Field(pattern=HHMM)
    title: str = Field(min_length=2, max_length=150)
    notes: str | None = Field(default=None, max_length=500)


class BookingOut(BaseModel):
    id: int
    space_id: int
    space_name: str
    user_id: int
    user_name: str
    title: str
    notes: str | None = None
    booking_date: date
    start_time: str
    end_time: str
    status: str
    
TokenOut.model_rebuild()