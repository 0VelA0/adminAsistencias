from datetime import date, datetime, timedelta

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator, model_validator

import re

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
    pending_count: int = 0
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

class ScheduleOut(BaseModel):
    start_time: str
    end_time: str
    tolerance_minutes: int
    work_days: list[int]
    is_custom: bool


class PersonOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    avatar: str | None = None
    is_active: bool
    hire_date: date | None = None
    employee_code: str | None = None
    position: str | None = None
    department: str | None = None
    manager_id: int | None = None
    phone: str | None = None
    is_top_level: bool = False
    schedule: ScheduleOut


class ProfileUpdateIn(BaseModel):
    employee_code: str | None = Field(default=None, max_length=30)
    position: str | None = Field(default=None, max_length=100)
    department: str | None = Field(default=None, max_length=100)
    manager_id: int | None = None
    hire_date: date | None = None
    custom_schedule: bool = False
    start_time: str | None = Field(default=None, pattern=HHMM)
    end_time: str | None = Field(default=None, pattern=HHMM)
    tolerance_minutes: int | None = Field(default=None, ge=0, le=180)
    work_days: list[int] | None = None
    is_top_level: bool = False

    @model_validator(mode="after")
    def valid_schedule(self):
        if not self.custom_schedule:
            return self

        if not self.start_time or not self.end_time or self.tolerance_minutes is None or not self.work_days:
            raise ValueError("Completa entrada, salida, tolerancia y días del horario propio.")

        if to_minutes(self.end_time) <= to_minutes(self.start_time):
            raise ValueError("La salida debe ser posterior a la entrada.")

        if any(day < 0 or day > 6 for day in self.work_days):
            raise ValueError("Los días van de 0 (lunes) a 6 (domingo).")

        return self


class ImportIn(BaseModel):
    content: str = Field(max_length=4_000_000)  # .xlsx en base64
    dry_run: bool = True


class ImportRowResult(BaseModel):
    row: int
    email: str
    full_name: str
    action: str  # create | update | error
    errors: list[str] = []


class ImportCredential(BaseModel):
    full_name: str
    email: str
    temporary_password: str


class ImportResult(BaseModel):
    dry_run: bool
    rows: list[ImportRowResult]
    created: int
    updated: int
    failed: int
    credentials: list[ImportCredential] = []


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

class IncidenceCodeOut(BaseModel):
    key: str
    code: str
    label: str
    include_in_incidences: bool
    color: str


class IncidenceCodeIn(BaseModel):
    key: str
    code: str = Field(min_length=1, max_length=10)
    label: str = Field(min_length=2, max_length=80)
    include_in_incidences: bool

    @field_validator("code")
    @classmethod
    def clean_code(cls, value: str) -> str:
        value = value.strip().upper()

        if not re.fullmatch(r"[A-Z0-9]{1,10}", value):
            raise ValueError("La clave solo admite letras y números, sin espacios (máximo 10).")

        return value


class ReportRequest(BaseModel):
    start: date
    end: date
    department: str | None = None
    user_id: int | None = None

    @model_validator(mode="after")
    def valid_range(self):
        if self.end < self.start:
            raise ValueError("La fecha final debe ser posterior a la inicial.")

        if (self.end - self.start).days > 366:
            raise ValueError("El periodo máximo es de un año.")

        return self


class ReportPersonOut(BaseModel):
    user_id: int
    employee_code: str | None = None
    full_name: str
    department: str | None = None
    position: str | None = None
    workdays: int
    counts: dict[str, int]
    hours: float
    late_minutes: int


class ReportPreviewOut(BaseModel):
    start: date
    end: date
    codes: list[IncidenceCodeOut]
    people: list[ReportPersonOut]
    totals: dict[str, int]
    hours: float
    late_minutes: int

class PostIn(BaseModel):
    kind: str
    title: str = Field(min_length=3, max_length=150)
    body: str = Field(default="", max_length=5000)
    image: str | None = Field(default=None, max_length=1_500_000)
    pinned: bool = False
    audience: str = Field(default="all", max_length=120)
    meeting_date: date | None = None
    start_time: str | None = Field(default=None, pattern=HHMM)
    end_time: str | None = Field(default=None, pattern=HHMM)
    location: str | None = Field(default=None, max_length=150)
    meeting_url: str | None = Field(default=None, max_length=300)
    space_id: int | None = None

    @model_validator(mode="after")
    def valid_post(self):
        if self.kind not in {"announcement", "meeting"}:
            raise ValueError("Tipo de publicación inválido.")

        if self.kind == "meeting":
            if not self.meeting_date or not self.start_time or not self.end_time:
                raise ValueError("La reunión necesita fecha, hora de inicio y hora de fin.")

            if to_minutes(self.end_time) <= to_minutes(self.start_time):
                raise ValueError("La reunión debe terminar después de empezar.")

        if self.meeting_url and not re.match(r"^https?://", self.meeting_url):
            raise ValueError("El enlace debe empezar con http:// o https://")

        return self


class PostAuthorOut(BaseModel):
    id: int
    full_name: str
    avatar: str | None = None
    position: str | None = None


class PostOut(BaseModel):
    id: int
    kind: str
    title: str
    body: str
    image: str | None = None
    pinned: bool
    audience: str
    audience_label: str
    created_at: datetime
    updated_at: datetime
    author: PostAuthorOut
    meeting_date: date | None = None
    start_time: str | None = None
    end_time: str | None = None
    location: str | None = None
    meeting_url: str | None = None
    space_id: int | None = None
    space_name: str | None = None
    counts: dict[str, int]
    my_response: str | None = None
    booking_id: int | None = None
    audience_size: int
    can_manage: bool


class PostsMetaOut(BaseModel):
    can_publish: bool
    can_target_all: bool
    departments: list[str]
    has_team: bool
    is_admin: bool


class RespondIn(BaseModel):
    response: str  # seen | yes | no | maybe | clear
    comment: str | None = Field(default=None, max_length=300)


class ResponsePersonOut(BaseModel):
    user_id: int
    full_name: str
    avatar: str | None = None
    position: str | None = None
    response: str | None = None
    comment: str | None = None


class CalendarEventOut(BaseModel):
    id: str
    type: str  # holiday | vacation | permission | meeting | booking | team_absence
    title: str
    subtitle: str | None = None
    start_date: date
    end_date: date
    start_time: str | None = None
    end_time: str | None = None
    page: str
    pending: bool = False
    
TokenOut.model_rebuild()