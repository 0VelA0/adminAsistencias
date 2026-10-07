from datetime import date, datetime, time, timedelta, timezone
from math import atan2, cos, radians, sin, sqrt
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pwdlib import PasswordHash
from sqlalchemy import and_, or_, select, inspect, text
from sqlalchemy.orm import Session
import base64

from .config import settings
from .database import Base, SessionLocal, engine
from .models import AttendanceRecord, QrSession, User, VacationRequest,PermissionRequest,UserPreferences,CompanySettings
from .schemas import (
    AdminVacationCreate,
    AttendanceAdminOut,
    AttendanceInput,
    AttendanceOut,
    AttendanceTodayOut,
    LoginInput,
    ManualAttendanceInput,
    QrAttendanceInput,
    TokenOut,
    UserCreate,
    UserOut,
    VacationRequestAdminOut,
    VacationRequestCreate,
    VacationRequestOut,
    VacationReviewInput,
    QrOut,
    PermissionRequestAdminOut,
    PermissionRequestCreate,
    PermissionRequestOut,
    PermissionReviewInput,
    VacationBalanceOut,
    count_workdays,
    ProfileUpdate,
    ProfileOut,
    PasswordChange,
    NotificationSettings,
    MissingTodayOut,
    UserCreatedOut,
    UserUpdate,
    AvatarInput,
    BrandingOut,
    BrandingUpdate
)


app = FastAPI(
    title="API de asistencia móvil",
    version="0.2.0",
)


# =========================================================
# CONFIGURACIÓN
# =========================================================

LOCAL_TIMEZONE = ZoneInfo(settings.timezone)

password_hash = PasswordHash.recommended()

JWT_ALGORITHM = "HS256"

VACATION_BASE_DAYS = 12
VACATION_YEARLY_INCREMENT = 2

AVATAR_FORMATS = {
    "data:image/jpeg;base64,": b"\xff\xd8\xff",
    "data:image/png;base64,": b"\x89PNG",
    "data:image/webp;base64,": b"RIFF",
}

MAX_AVATAR_BYTES = 300_000


# =========================================================
# CORS
# =========================================================

cors_origins = [
    origin.strip()
    for origin in settings.cors_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# UTILIDADES
# =========================================================


def distance_meters(
    latitude1: float,
    longitude1: float,
    latitude2: float,
    longitude2: float,
) -> float:
    """
    Calcula la distancia aproximada entre dos coordenadas
    utilizando la fórmula de Haversine.
    """

    earth_radius = 6_371_000

    lat1 = radians(latitude1)
    lat2 = radians(latitude2)

    delta_lat = radians(latitude2 - latitude1)
    delta_lon = radians(longitude2 - longitude1)

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return earth_radius * c


def get_local_now() -> datetime:
    """
    Obtiene la fecha/hora actual de la empresa.
    """

    return datetime.now(timezone.utc).astimezone(
        LOCAL_TIMEZONE
    )


def get_work_date(
    value: datetime | None = None,
) -> date:
    """
    Obtiene la fecha laboral utilizando el timezone
    configurado para la empresa.
    """

    if value is None:
        return get_local_now().date()

    return value.astimezone(LOCAL_TIMEZONE).date()


def normalize_datetime(value: datetime) -> datetime:
    """
    Convierte una fecha/hora recibida sin timezone
    en una fecha/hora con timezone local.

    Si ya tiene timezone, se conserva.
    """

    if value.tzinfo is None:
        return value.replace(
            tzinfo=LOCAL_TIMEZONE
        )

    return value


def is_late_entry(recorded_at: datetime) -> bool:
    """
    Determina si una entrada debe marcarse como late.

    Ejemplo:

    Inicio: 09:00
    Tolerancia: 10 minutos

    Hasta 09:10 -> normal
    Desde 09:11 -> late
    """

    local_datetime = normalize_datetime(
        recorded_at
    ).astimezone(LOCAL_TIMEZONE)

    hours, minutes = map(
        int,
        settings.work_start_time.split(":")[:2],
    )

    work_start = local_datetime.replace(
        hour=hours,
        minute=minutes,
        second=0,
        microsecond=0,
    )

    late_limit = work_start + timedelta(
        minutes=settings.late_grace_minutes
    )

    return local_datetime > late_limit


# =========================================================
# AUTENTICACIÓN
# =========================================================


def create_access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.jwt_expiry_days
    )

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=JWT_ALGORITHM,
    )


def get_user_from_token(
    token: str,
    db: Session,
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[JWT_ALGORITHM],
        )

        user_id = payload.get("sub")

        if not user_id:
            raise credentials_exception

        user = db.get(
            User,
            int(user_id),
        )

        if not user:
            raise credentials_exception

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario está desactivado.",
            )

        return user

    except (jwt.PyJWTError, ValueError):
        raise credentials_exception


def current_user(
    db: Session = Depends(SessionLocal),
) -> User:
    """
    Placeholder reemplazado por el header Authorization
    en la dependencia real.
    """

    raise HTTPException(
        status_code=500,
        detail="Configuración incorrecta de autenticación.",
    )


# =========================================================
# DEPENDENCIA DB + AUTH
# =========================================================


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def authenticated_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:

    return get_user_from_token(
        token,
        db,
    )


def admin_user(
    user: User = Depends(authenticated_user),
) -> User:

    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador.",
        )

    return user


# =========================================================
# ASISTENCIA
# =========================================================


def get_attendance_for_date(
    user_id: int,
    work_date: date,
    db: Session,
) -> dict:

    records = db.scalars(
        select(AttendanceRecord)
        .where(
            AttendanceRecord.user_id == user_id,
            AttendanceRecord.work_date == work_date,
        )
        .order_by(
            AttendanceRecord.recorded_at
        )
    ).all()

    result = {
        "entry": None,
        "exit": None,
    }

    for record in records:
        if record.kind == "entry":
            result["entry"] = record

        elif record.kind == "exit":
            result["exit"] = record

    return result


def get_today_attendance(
    user_id: int,
    db: Session,
) -> dict:

    return get_attendance_for_date(
        user_id,
        get_work_date(),
        db,
    )


def get_active_vacation(
    user_id: int,
    db: Session,
    work_date: date | None = None,
) -> VacationRequest | None:

    if work_date is None:
        work_date = get_work_date()

    return db.scalar(
        select(VacationRequest)
        .where(
            VacationRequest.user_id == user_id,
            VacationRequest.status == "approved",
            VacationRequest.start_date <= work_date,
            VacationRequest.end_date >= work_date,
        )
        .limit(1)
    )


def create_attendance_record(
    *,
    user: User,
    db: Session,
    kind: str,
    source: str,
    latitude: float | None = None,
    longitude: float | None = None,
    accuracy_meters: float | None = None,
    recorded_at: datetime | None = None,
    work_date: date | None = None,
    status_override: str | None = None,
    created_by_id: int | None = None,
    note: str | None = None,
) -> AttendanceRecord:

    # -----------------------------------------------------
    # 1. Validar tipo de asistencia
    # -----------------------------------------------------

    if kind not in {"entry", "exit"}:
        raise HTTPException(
            status_code=400,
            detail="El tipo de asistencia debe ser entry o exit.",
        )

    # -----------------------------------------------------
    # 2. Fecha/hora
    # -----------------------------------------------------

    if recorded_at is None:
        recorded_at = datetime.now(timezone.utc)

    recorded_at = normalize_datetime(
        recorded_at
    )

    if work_date is None:
        work_date = get_work_date(
            recorded_at
        )

    # -----------------------------------------------------
    # 3. Validar que el usuario esté activo
    # -----------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="El usuario está desactivado.",
        )

    # -----------------------------------------------------
    # 4. Revisar vacaciones
    # -----------------------------------------------------

    vacation = get_active_vacation(
        user.id,
        db,
        work_date,
    )

    if vacation:
        raise HTTPException(
            status_code=409,
            detail=(
                "El usuario tiene vacaciones aprobadas "
                "para esta fecha."
            ),
        )

    # -----------------------------------------------------
    # 5. Revisar asistencia existente
    # -----------------------------------------------------

    attendance = get_attendance_for_date(
        user.id,
        work_date,
        db,
    )

    if kind == "entry" and attendance["entry"]:
        raise HTTPException(
            status_code=409,
            detail="El usuario ya registró su entrada para este día.",
        )

    if kind == "exit" and attendance["exit"]:
        raise HTTPException(
            status_code=409,
            detail="El usuario ya registró su salida para este día.",
        )

    # -----------------------------------------------------
    # 6. No permitir salida sin entrada
    # -----------------------------------------------------

    if kind == "exit" and not attendance["entry"]:
        raise HTTPException(
            status_code=409,
            detail=(
                "No se puede registrar la salida "
                "porque no existe una entrada para este día."
            ),
        )

    # -----------------------------------------------------
    # 7. GPS para registros hechos por empleado
    # -----------------------------------------------------

    if source == "employee":

        if (
            latitude is None
            or longitude is None
            or accuracy_meters is None
        ):
            raise HTTPException(
                status_code=400,
                detail="La ubicación es obligatoria.",
            )

        distance = distance_meters(
            latitude,
            longitude,
            settings.company_latitude,
            settings.company_longitude,
        )

        if distance > settings.allowed_radius_meters:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Estás fuera del área permitida "
                    "para registrar asistencia."
                ),
            )

    # -----------------------------------------------------
    # 8. Registro administrativo
    # -----------------------------------------------------

    else:

        latitude = (
            settings.company_latitude
            if latitude is None
            else latitude
        )

        longitude = (
            settings.company_longitude
            if longitude is None
            else longitude
        )

        accuracy_meters = (
            0
            if accuracy_meters is None
            else accuracy_meters
        )

        distance = 0.0

    # -----------------------------------------------------
    # 9. Determinar estado
    # -----------------------------------------------------

    if status_override is not None:

        if status_override not in {
            "normal",
            "late",
        }:
            raise HTTPException(
                status_code=400,
                detail=(
                    "El estado debe ser normal o late."
                ),
            )

        attendance_status = status_override

    else:

        if kind == "entry":
            attendance_status = (
                "late"
                if is_late_entry(recorded_at)
                else "normal"
            )
        else:
            attendance_status = "normal"

    # -----------------------------------------------------
    # 10. Crear registro
    # -----------------------------------------------------

    record = AttendanceRecord(
        user_id=user.id,
        kind=kind,
        work_date=work_date,
        recorded_at=recorded_at.astimezone(timezone.utc),
        latitude=latitude,
        longitude=longitude,
        accuracy_meters=accuracy_meters,
        distance_meters=distance,
        source=source,
        status=attendance_status,
        created_by_id=created_by_id,
        note=note,
    )

    db.add(record)

    try:
        db.commit()
        db.refresh(record)

    except Exception as exc:
        db.rollback()

        # Puede ser una violación de la restricción única
        # si dos peticiones llegaron prácticamente al mismo tiempo.
        raise HTTPException(
            status_code=409,
            detail=(
                "No se pudo registrar la asistencia. "
                "Es posible que ya exista un registro "
                "para ese tipo y fecha."
            ),
        ) from exc

    return record

def ensure_user_columns() -> None:
    existing = {c["name"] for c in inspect(engine).get_columns("users")}

    with engine.begin() as conn:
        if "hire_date" not in existing:
            conn.execute(text("ALTER TABLE users ADD COLUMN hire_date DATE"))

        if "avatar" not in existing:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar TEXT"))

# =========================================================
# STARTUP
# =========================================================


@app.on_event("startup")
def startup():

    Base.metadata.create_all(
        bind=engine
    )

    ensure_user_columns()

    db = SessionLocal()

    try:

        admin = db.scalar(
            select(User)
            .where(
                User.email
                == settings.initial_admin_email
            )
        )

        if not admin:

            admin = User(
                email=settings.initial_admin_email,
                full_name="Administrador",
                password_hash=password_hash.hash(
                    settings.initial_admin_password
                ),
                role="admin",
                is_active=True,
            )

            db.add(admin)

        # -------------------------------------------------
        # Crear empleado inicial si no existe
        # -------------------------------------------------

        employees = [
           ("lili@integraprofesional.com","Lili"),
           ("cindy@integraprofesional.com","Cindy"),
           ("eleazar@integraprofesional.com","Eleazar"),
           ("angel@integraprofesional.com","Angel"),
           ("jesus@integraprofesional.com","Jesus"),
           ("norma@integraprofesional.com", "Norma"),
           ("raul@integraprofesional.com", "Raul")
        ]

        for email, full_name in employees:
            employee = db.scalar(
                select(User)
                .where(
                    User.email == email
                )
            )

            if not employee:

                employee = User(
                    email= email,
                    full_name= full_name,
                    password_hash=password_hash.hash(
                        settings.employee_initial_password
                    ),
                    role="employee",
                    is_active=True,
                )

                db.add(employee)

        get_branding(db)
        db.commit()

    finally:
        db.close()


# =========================================================
# HEALTH
# =========================================================


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


# =========================================================
# AUTH
# =========================================================


@app.post(
    "/auth/login",
    response_model=TokenOut,
)
def login(
    data: LoginInput,
    db: Session = Depends(get_db),
):

    user = db.scalar(
        select(User)
        .where(
            User.email == str(data.email).lower()
        )
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos.",
        )

    if not password_hash.verify(
        data.password,
        user.password_hash,
    ):

        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos.",
        )

    if not user.is_active:

        raise HTTPException(
            status_code=403,
            detail="El usuario está desactivado.",
        )

    token = create_access_token(user)

    return TokenOut(
        access_token=token,
        token_type="bearer",
        user=user,
    )


@app.get(
    "/auth/me",
    response_model=UserOut,
)
def me(
    user: User = Depends(authenticated_user),
):
    return user


# =========================================================
# USERS
# =========================================================


@app.get(
    "/users",
    response_model=list[UserOut],
)
def list_users(
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    return db.scalars(
        select(User)
        .order_by(User.full_name)
    ).all()


@app.post(
    "/users",
    response_model=UserOut,
)
def create_user(
    data: UserCreate,
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    email = str(data.email).lower()

    existing = db.scalar(
        select(User)
        .where(User.email == email)
    )

    if existing:

        raise HTTPException(
            status_code=409,
            detail="Ya existe un usuario con ese correo.",
        )

    hire_date = data.hire_date 

    user = User(
        email=email,
        full_name=data.full_name,
        password_hash=password_hash.hash(
            settings.employee_initial_password
        ),
        role=data.role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# =========================================================
# ATTENDANCE - EMPLOYEE
# =========================================================


@app.post(
    "/attendance/manual",
    response_model=AttendanceOut,
)
def manual_attendance(
    data: ManualAttendanceInput,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    employee = db.get(
        User,
        data.user_id,
    )

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado.",
        )

    if employee.role == "admin":

        raise HTTPException(
            status_code=400,
            detail="No se puede registrar asistencia manual para un administrador.",
        )

    today = get_work_date()

    if data.work_date > today:

        raise HTTPException(
            status_code=400,
            detail="No se puede registrar asistencia para una fecha futura.",
        )

    recorded_at = normalize_datetime(
        data.recorded_at
    )

    # Si el administrador manda una fecha diferente
    # a work_date, verificamos que realmente coincidan.
    recorded_local_date = get_work_date(
        recorded_at
    )

    if recorded_local_date != data.work_date:

        raise HTTPException(
            status_code=400,
            detail=(
                "La fecha de recorded_at no coincide "
                "con work_date."
            ),
        )

    return create_attendance_record(
        user=employee,
        db=db,
        kind=data.kind,
        source="admin",
        recorded_at=recorded_at,
        work_date=data.work_date,
        status_override=data.status,
        created_by_id=admin.id,
        note=data.note,
    )

@app.post(
    "/attendance/{kind}",
    response_model=AttendanceOut,
)
def register_attendance(
    kind: str,
    data: AttendanceInput,
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    return create_attendance_record(
        user=user,
        db=db,
        kind=kind,
        source="employee",
        latitude=data.latitude,
        longitude=data.longitude,
        accuracy_meters=data.accuracy_meters,
    )


@app.get(
    "/attendance/mine",
    response_model=list[AttendanceOut],
)
def my_attendance(
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    return db.scalars(
        select(AttendanceRecord)
        .where(
            AttendanceRecord.user_id == user.id
        )
        .order_by(
            AttendanceRecord.recorded_at.desc()
        )
    ).all()


@app.get(
    "/attendance/today",
    response_model=AttendanceTodayOut,
)
def attendance_today(
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    today = get_work_date()

    attendance = get_attendance_for_date(
        user.id,
        today,
        db,
    )

    vacation = get_active_vacation(
        user.id,
        db,
        today,
    )

    return AttendanceTodayOut(
        work_date=today,
        entry=attendance["entry"],
        exit=attendance["exit"],
        is_on_vacation=vacation is not None,
    )


# =========================================================
# ATTENDANCE - ADMIN
# =========================================================


@app.get(
    "/attendance",
    response_model=list[AttendanceAdminOut],
)
def list_all_attendance(
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    rows = db.execute(
        select(
            AttendanceRecord,
            User.full_name,
            User.email,
        )
        .join(
            User,
            AttendanceRecord.user_id == User.id,
        )
        .order_by(
            AttendanceRecord.work_date.desc(),
            AttendanceRecord.recorded_at.desc(),
        )
    ).all()

    result = []

    for record, user_name, user_email in rows:

        result.append(
            AttendanceAdminOut(
                id=record.id,
                kind=record.kind,
                work_date=record.work_date,
                recorded_at=record.recorded_at,
                distance_meters=record.distance_meters,
                accuracy_meters=record.accuracy_meters,
                source=record.source,
                status=record.status,
                note=record.note,
                user_name=user_name,
                user_email=user_email,
            )
        )

    return result


@app.get(
    "/attendance/missing-today",
    response_model=MissingTodayOut,
)
def missing_today(
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    now_local = get_local_now()
    today = now_local.date()

    hours, minutes = map(
        int,
        settings.work_start_time.split(":")[:2],
    )

    late_limit = now_local.replace(
        hour=hours,
        minute=minutes,
        second=0,
        microsecond=0,
    ) + timedelta(minutes=settings.late_grace_minutes)

    base = {
        "work_date": today,
        "is_workday": today.weekday() < 5,
        "late_limit": late_limit.strftime("%H:%M"),
        "limit_passed": now_local > late_limit,
    }

    if not base["is_workday"]:
        return MissingTodayOut(
            **base,
            missing=[],
            on_vacation=[],
            on_permission=[],
        )

    employees = db.scalars(
        select(User)
        .where(
            User.role == "employee",
            User.is_active.is_(True),
        )
        .order_by(User.full_name)
    ).all()

    entered_ids = set(
        db.scalars(
            select(AttendanceRecord.user_id).where(
                AttendanceRecord.work_date == today,
                AttendanceRecord.kind == "entry",
            )
        ).all()
    )

    vacation_ids = set(
        db.scalars(
            select(VacationRequest.user_id).where(
                VacationRequest.status == "approved",
                VacationRequest.start_date <= today,
                VacationRequest.end_date >= today,
            )
        ).all()
    )

    permission_ids = set(
        db.scalars(
            select(PermissionRequest.user_id).where(
                PermissionRequest.status == "approved",
                PermissionRequest.start_date <= today,
                PermissionRequest.end_date >= today,
            )
        ).all()
    )

    missing = []
    on_vacation = []
    on_permission = []

    for employee in employees:
        if employee.id in entered_ids:
            continue

        if employee.id in vacation_ids:
            on_vacation.append(employee)
        elif employee.id in permission_ids:
            on_permission.append(employee)
        else:
            missing.append(employee)

    return MissingTodayOut(
        **base,
        missing=missing,
        on_vacation=on_vacation,
        on_permission=on_permission,
    )


# =========================================================
# QR ATTENDANCE
# =========================================================


@app.post(
    "/qr-attendance",
    response_model=AttendanceOut,
)
def qr_attendance(
    data: QrAttendanceInput,
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    if data.station != settings.attendance_station_code:

        raise HTTPException(
            status_code=403,
            detail="Estación QR no válida.",
        )

    attendance = get_today_attendance(
        user.id,
        db,
    )

    if not attendance["entry"]:
        kind = "entry"

    elif not attendance["exit"]:
        kind = "exit"

    else:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya registraste entrada y salida "
                "para este día."
            ),
        )

    return create_attendance_record(
        user=user,
        db=db,
        kind=kind,
        source="employee",
        latitude=data.latitude,
        longitude=data.longitude,
        accuracy_meters=data.accuracy_meters,
    )


# =========================================================
# QR SESSION
# =========================================================


@app.post(
    "/qr-sessions",
    response_model=QrOut,
)
def create_qr_session(
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    code = uuid4().hex

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=10
    )

    session = QrSession(
        code=code,
        expires_at=expires_at,
        created_by_id=admin.id,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return QrOut(
        code=session.code,
        expires_at=session.expires_at,
    )


# =========================================================
# VACACIONES - EMPLOYEE
# =========================================================


@app.post(
    "/vacations/requests",
    response_model=VacationRequestOut,
)
def create_vacation_request(
    data: VacationRequestCreate,
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    today = get_work_date()

    if data.start_date < today:

        raise HTTPException(
            status_code=400,
            detail=(
                "La fecha inicial de vacaciones "
                "no puede estar en el pasado."
            ),
        )

    if data.end_date < data.start_date:

        raise HTTPException(
            status_code=400,
            detail=(
                "La fecha final no puede ser anterior "
                "a la fecha inicial."
            ),
        )

    overlapping = db.scalar(
        select(VacationRequest)
        .where(
            VacationRequest.user_id == user.id,
            VacationRequest.status.in_(
                ["pending", "approved"]
            ),
            VacationRequest.start_date
            <= data.end_date,
            VacationRequest.end_date
            >= data.start_date,
        )
        .limit(1)
    )

    if overlapping:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe una solicitud o vacaciones "
                "aprobadas que se cruzan con esas fechas."
            ),
        )

    if count_workdays(data.start_date, data.end_date) == 0:
        raise HTTPException(
            status_code=400,
            detail="El periodo no incluye días laborables.",
        )

    for year in range(data.start_date.year, data.end_date.year + 1):
        first = date(year, 1, 1)
        last = date(year, 12, 31)

        requested = count_workdays(
            max(data.start_date, first),
            min(data.end_date, last),
        )

        used = vacation_days_in_year(
            db, user.id, year, ["pending", "approved"]
        )

        available = max(
            vacation_entitlement(user.hire_date, year) - used,
            0,
        )

        if requested > available:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"No tienes suficientes días en {year}: "
                    f"solicitas {requested} y tienes {available} disponibles."
                ),
            )

    vacation = VacationRequest(
        user_id=user.id,
        start_date=data.start_date,
        end_date=data.end_date,
        status="pending",
        request_type="employee",
        reason=data.reason,
    )

    db.add(vacation)
    db.commit()
    db.refresh(vacation)

    return vacation


@app.get(
    "/vacations/mine",
    response_model=list[VacationRequestOut],
)
def my_vacations(
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    vacations = db.scalars(
        select(VacationRequest)
        .where(VacationRequest.user_id == user.id)
        .order_by(VacationRequest.start_date.desc())
    ).all()

    return [vacation_to_out(v, db) for v in vacations]


@app.post(
    "/vacations/{vacation_id}/cancel",
    response_model=VacationRequestOut,
)
def cancel_vacation(
    vacation_id: int,
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    vacation = db.get(
        VacationRequest,
        vacation_id,
    )

    if not vacation:

        raise HTTPException(
            status_code=404,
            detail="Solicitud de vacaciones no encontrada.",
        )

    if vacation.user_id != user.id:

        raise HTTPException(
            status_code=403,
            detail="No puedes cancelar esta solicitud.",
        )

    if vacation.status != "pending":

        raise HTTPException(
            status_code=409,
            detail=(
                "Solo se pueden cancelar solicitudes pendientes."
            ),
        )

    vacation.status = "cancelled"
    vacation.updated_at = datetime.now(
        timezone.utc
    )

    db.commit()
    db.refresh(vacation)

    return vacation


def vacation_days_in_year(
    db: Session,
    user_id: int,
    year: int,
    statuses: list[str],
) -> int:

    first = date(year, 1, 1)
    last = date(year, 12, 31)

    rows = db.scalars(
        select(VacationRequest).where(
            VacationRequest.user_id == user_id,
            VacationRequest.status.in_(statuses),
            VacationRequest.start_date <= last,
            VacationRequest.end_date >= first,
        )
    ).all()

    return sum(
        count_workdays(max(r.start_date, first), min(r.end_date, last))
        for r in rows
    )


def vacation_entitlement(hire_date: date | None, year: int) -> int:
    if hire_date is None:
        return VACATION_BASE_DAYS

    return VACATION_BASE_DAYS + VACATION_YEARLY_INCREMENT * max(
        year - hire_date.year, 0
    )


def build_vacation_balance(
    db: Session,
    user: User,
    year: int,
) -> VacationBalanceOut:

    total = vacation_entitlement(user.hire_date, year)
    used = vacation_days_in_year(db, user.id, year, ["approved"])
    pending = vacation_days_in_year(db, user.id, year, ["pending"])

    return VacationBalanceOut(
        year=year,
        total_days=total,
        used_days=used,
        pending_days=pending,
        available_days=max(total - used - pending, 0),
    )

def vacation_to_out(
    vacation: VacationRequest,
    db: Session,
) -> VacationRequestOut:

    out = VacationRequestOut.model_validate(vacation)

    if vacation.reviewed_by_id:
        reviewer = db.get(User, vacation.reviewed_by_id)
        out.reviewed_by_name = reviewer.full_name if reviewer else None

    return out


@app.get(
    "/vacations/balance",
    response_model=VacationBalanceOut,
)
def my_vacation_balance(
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):
    return build_vacation_balance(db, user, get_work_date().year)

# =========================================================
# VACACIONES - ADMIN
# =========================================================


@app.get(
    "/vacations/requests",
    response_model=list[VacationRequestAdminOut],
)
def list_vacation_requests(
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    rows = db.execute(
        select(
            VacationRequest,
            User.full_name,
            User.email,
        )
        .join(
            User,
            VacationRequest.user_id == User.id,
        )
        .order_by(
            VacationRequest.created_at.desc()
        )
    ).all()

    result = []

    for vacation, user_name, user_email in rows:

        result.append(
            VacationRequestAdminOut(
                id=vacation.id,
                user_id=vacation.user_id,
                start_date=vacation.start_date,
                end_date=vacation.end_date,
                status=vacation.status,
                request_type=vacation.request_type,
                reason=vacation.reason,
                admin_note=vacation.admin_note,
                reviewed_by_id=vacation.reviewed_by_id,
                reviewed_at=vacation.reviewed_at,
                created_at=vacation.created_at,
                updated_at=vacation.updated_at,
                user_name=user_name,
                user_email=user_email,
            )
        )

    return result


@app.post(
    "/vacations/{vacation_id}/approve",
    response_model=VacationRequestOut,
)
def approve_vacation(
    vacation_id: int,
    data: VacationReviewInput,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    vacation = db.get(
        VacationRequest,
        vacation_id,
    )

    if not vacation:

        raise HTTPException(
            status_code=404,
            detail="Solicitud de vacaciones no encontrada.",
        )

    if vacation.status != "pending":

        raise HTTPException(
            status_code=409,
            detail=(
                "Solo se pueden aprobar solicitudes pendientes."
            ),
        )

    overlapping = db.scalar(
        select(VacationRequest)
        .where(
            VacationRequest.user_id == vacation.user_id,
            VacationRequest.id != vacation.id,
            VacationRequest.status == "approved",
            VacationRequest.start_date
            <= vacation.end_date,
            VacationRequest.end_date
            >= vacation.start_date,
        )
        .limit(1)
    )

    if overlapping:

        raise HTTPException(
            status_code=409,
            detail=(
                "El empleado ya tiene vacaciones aprobadas "
                "que se cruzan con estas fechas."
            ),
        )

    vacation.status = "approved"
    vacation.admin_note = data.admin_note
    vacation.reviewed_by_id = admin.id
    vacation.reviewed_at = datetime.now(
        timezone.utc
    )

    db.commit()
    db.refresh(vacation)

    return vacation


@app.post(
    "/vacations/{vacation_id}/reject",
    response_model=VacationRequestOut,
)
def reject_vacation(
    vacation_id: int,
    data: VacationReviewInput,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    vacation = db.get(
        VacationRequest,
        vacation_id,
    )

    if not vacation:

        raise HTTPException(
            status_code=404,
            detail="Solicitud de vacaciones no encontrada.",
        )

    if vacation.status != "pending":

        raise HTTPException(
            status_code=409,
            detail=(
                "Solo se pueden rechazar solicitudes pendientes."
            ),
        )

    vacation.status = "rejected"
    vacation.admin_note = data.admin_note
    vacation.reviewed_by_id = admin.id
    vacation.reviewed_at = datetime.now(
        timezone.utc
    )

    db.commit()
    db.refresh(vacation)

    return vacation


@app.post(
    "/vacations/admin",
    response_model=VacationRequestOut,
)
def create_admin_vacation(
    data: AdminVacationCreate,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    employee = db.get(
        User,
        data.user_id,
    )

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado.",
        )

    if employee.role == "admin":

        raise HTTPException(
            status_code=400,
            detail=(
                "No se pueden registrar vacaciones "
                "para otro administrador."
            ),
        )

    today = get_work_date()

    if data.start_date < today:

        raise HTTPException(
            status_code=400,
            detail=(
                "La fecha inicial de vacaciones "
                "no puede estar en el pasado."
            ),
        )

    overlapping = db.scalar(
        select(VacationRequest)
        .where(
            VacationRequest.user_id == data.user_id,
            VacationRequest.status.in_(
                ["pending", "approved"]
            ),
            VacationRequest.start_date
            <= data.end_date,
            VacationRequest.end_date
            >= data.start_date,
        )
        .limit(1)
    )

    if overlapping:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe una solicitud o vacaciones "
                "que se cruzan con esas fechas."
            ),
        )

    vacation = VacationRequest(
        user_id=data.user_id,
        start_date=data.start_date,
        end_date=data.end_date,
        status="approved",
        request_type="admin",
        reason=data.reason,
        admin_note=data.admin_note,
        reviewed_by_id=admin.id,
        reviewed_at=datetime.now(timezone.utc),
    )

    db.add(vacation)
    db.commit()
    db.refresh(vacation)

    return vacation

# =========================================================
# PERMISOS
# =========================================================


def permission_to_out(
    permission: PermissionRequest,
    db: Session,
) -> PermissionRequestOut:

    out = PermissionRequestOut.model_validate(permission)

    if permission.reviewed_by_id:
        reviewer = db.get(User, permission.reviewed_by_id)
        out.reviewed_by_name = reviewer.full_name if reviewer else None

    return out


@app.post(
    "/permissions",
    response_model=PermissionRequestOut,
)
def create_permission_request(
    data: PermissionRequestCreate,
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    if data.start_date < get_work_date():
        raise HTTPException(
            status_code=400,
            detail="La fecha inicial no puede estar en el pasado.",
        )

    overlapping_permission = db.scalar(
        select(PermissionRequest)
        .where(
            PermissionRequest.user_id == user.id,
            PermissionRequest.status.in_(["pending", "approved"]),
            PermissionRequest.start_date <= data.end_date,
            PermissionRequest.end_date >= data.start_date,
        )
        .limit(1)
    )

    if overlapping_permission:
        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe un permiso pendiente o aprobado "
                "que se cruza con esas fechas."
            ),
        )

    overlapping_vacation = db.scalar(
        select(VacationRequest)
        .where(
            VacationRequest.user_id == user.id,
            VacationRequest.status == "approved",
            VacationRequest.start_date <= data.end_date,
            VacationRequest.end_date >= data.start_date,
        )
        .limit(1)
    )

    if overlapping_vacation:
        raise HTTPException(
            status_code=409,
            detail="Tienes vacaciones aprobadas en esas fechas.",
        )

    permission = PermissionRequest(
        user_id=user.id,
        kind=data.kind,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        status="pending",
    )

    db.add(permission)
    db.commit()
    db.refresh(permission)

    return permission_to_out(permission, db)


@app.get(
    "/permissions/mine",
    response_model=list[PermissionRequestOut],
)
def my_permissions(
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    permissions = db.scalars(
        select(PermissionRequest)
        .where(PermissionRequest.user_id == user.id)
        .order_by(PermissionRequest.created_at.desc())
    ).all()

    return [permission_to_out(p, db) for p in permissions]


@app.post(
    "/permissions/{permission_id}/cancel",
    response_model=PermissionRequestOut,
)
def cancel_permission(
    permission_id: int,
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    permission = db.get(PermissionRequest, permission_id)

    if not permission:
        raise HTTPException(
            status_code=404,
            detail="Solicitud de permiso no encontrada.",
        )

    if permission.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="No puedes cancelar esta solicitud.",
        )

    if permission.status != "pending":
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden cancelar solicitudes pendientes.",
        )

    permission.status = "cancelled"
    db.commit()
    db.refresh(permission)

    return permission_to_out(permission, db)


@app.get(
    "/permissions/requests",
    response_model=list[PermissionRequestAdminOut],
)
def list_permission_requests(
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    rows = db.execute(
        select(
            PermissionRequest,
            User.full_name,
            User.email,
        )
        .join(User, PermissionRequest.user_id == User.id)
        .order_by(PermissionRequest.created_at.desc())
    ).all()

    result = []

    for permission, user_name, user_email in rows:
        base = permission_to_out(permission, db)

        result.append(
            PermissionRequestAdminOut(
                **base.model_dump(),
                user_name=user_name,
                user_email=user_email,
            )
        )

    return result


def review_permission(
    permission_id: int,
    data: PermissionReviewInput,
    admin: User,
    db: Session,
    new_status: str,
) -> PermissionRequestOut:

    permission = db.get(PermissionRequest, permission_id)

    if not permission:
        raise HTTPException(
            status_code=404,
            detail="Solicitud de permiso no encontrada.",
        )

    if permission.status != "pending":
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden resolver solicitudes pendientes.",
        )

    permission.status = new_status
    permission.admin_note = data.admin_note
    permission.reviewed_by_id = admin.id
    permission.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(permission)

    return permission_to_out(permission, db)


@app.post(
    "/permissions/{permission_id}/approve",
    response_model=PermissionRequestOut,
)
def approve_permission(
    permission_id: int,
    data: PermissionReviewInput,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    return review_permission(permission_id, data, admin, db, "approved")


@app.post(
    "/permissions/{permission_id}/reject",
    response_model=PermissionRequestOut,
)
def reject_permission(
    permission_id: int,
    data: PermissionReviewInput,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    return review_permission(permission_id, data, admin, db, "rejected")


# =========================================================
# PERFIL, NOTIFICACIONES Y SEGURIDAD
# =========================================================


def get_or_create_preferences(
    db: Session,
    user_id: int,
) -> UserPreferences:

    prefs = db.scalar(
        select(UserPreferences).where(
            UserPreferences.user_id == user_id
        )
    )

    if not prefs:
        prefs = UserPreferences(user_id=user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    return prefs


def profile_out(user: User, prefs: UserPreferences) -> ProfileOut:
    return ProfileOut(
        full_name=user.full_name,
        email=user.email,
        phone=prefs.phone,
    )


@app.get(
    "/profile",
    response_model=ProfileOut,
)
def get_profile(
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):
    return profile_out(user, get_or_create_preferences(db, user.id))


@app.put(
    "/profile",
    response_model=ProfileOut,
)
def update_profile(
    data: ProfileUpdate,
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    prefs = get_or_create_preferences(db, user.id)

    user.full_name = data.full_name.strip()

    phone = (data.phone or "").strip()
    prefs.phone = phone or None

    db.commit()
    db.refresh(user)
    db.refresh(prefs)

    return profile_out(user, prefs)


@app.get(
    "/profile/notifications",
    response_model=NotificationSettings,
)
def get_notifications(
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):
    return get_or_create_preferences(db, user.id)


@app.put(
    "/profile/notifications",
    response_model=NotificationSettings,
)
def update_notifications(
    data: NotificationSettings,
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    prefs = get_or_create_preferences(db, user.id)

    prefs.notify_attendance = data.notify_attendance
    prefs.notify_vacations = data.notify_vacations
    prefs.notify_permissions = data.notify_permissions
    prefs.notify_company = data.notify_company
    prefs.notify_weekly = data.notify_weekly

    db.commit()
    db.refresh(prefs)

    return prefs


@app.post("/auth/change-password")
def change_password(
    data: PasswordChange,
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):

    if not password_hash.verify(
        data.current_password,
        user.password_hash,
    ):
        # 400 y no 401, para no confundir con sesión expirada
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual es incorrecta.",
        )

    if data.new_password == data.current_password:
        raise HTTPException(
            status_code=400,
            detail="La nueva contraseña debe ser diferente a la actual.",
        )

    user.password_hash = password_hash.hash(data.new_password)
    db.commit()

    return {"ok": True}


def generate_temporary_password() -> str:
    return secrets.token_urlsafe(9)  # 12 caracteres


@app.post(
    "/users",
    response_model=UserCreatedOut,
)
def create_user(
    data: UserCreate,
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    email = str(data.email).lower()

    existing = db.scalar(
        select(User).where(User.email == email)
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un usuario con ese correo.",
        )

    temporary_password = generate_temporary_password()

    user = User(
        email=email,
        full_name=data.full_name.strip(),
        password_hash=password_hash.hash(temporary_password),
        role=data.role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserCreatedOut(
        **UserOut.model_validate(user).model_dump(),
        temporary_password=temporary_password,
    )


@app.patch(
    "/users/{user_id}",
    response_model=UserOut,
)
def update_user(
    user_id: int,
    data: UserUpdate,
    admin: User = Depends(admin_user),
    db: Session = Depends(get_db),
):

    target = db.get(User, user_id)

    if not target:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado.",
        )

    if target.id == admin.id:
        if data.is_active is False or (
            data.role is not None and data.role != "admin"
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "No puedes desactivarte ni quitarte "
                    "el rol de administrador a ti mismo."
                ),
            )

        if data.password is not None:
            raise HTTPException(
                status_code=400,
                detail="Para cambiar tu propia contraseña usa Configuración.",
            )

    if data.full_name is not None:
        target.full_name = data.full_name.strip()

    if data.role is not None:
        target.role = data.role

    if data.is_active is not None:
        target.is_active = data.is_active

    if data.password is not None:
        target.password_hash = password_hash.hash(data.password)

    if data.hire_date is not None:
        target.hire_date = data.hire_date

    db.commit()
    db.refresh(target)

    return target

# AVATAR

def validate_avatar(value: str) -> None:
    for prefix, magic in AVATAR_FORMATS.items():
        if not value.startswith(prefix):
            continue

        try:
            raw = base64.b64decode(value[len(prefix):], validate=True)
        except Exception:
            break

        if len(raw) <= MAX_AVATAR_BYTES and raw.startswith(magic):
            return

        break

    raise HTTPException(
        status_code=400,
        detail="La imagen no es válida. Usa JPG, PNG o WebP de máximo 300 KB.",
    )


@app.put(
    "/profile/avatar",
    response_model=UserOut,
)
def set_avatar(
    data: AvatarInput,
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):
    validate_avatar(data.avatar)

    user.avatar = data.avatar
    db.commit()
    db.refresh(user)

    return user


@app.delete(
    "/profile/avatar",
    response_model=UserOut,
)
def remove_avatar(
    user: User = Depends(authenticated_user),
    db: Session = Depends(get_db),
):
    user.avatar = None
    db.commit()
    db.refresh(user)

    return user


def get_branding(db: Session) -> CompanySettings:
    row = db.get(CompanySettings, 1)

    if not row:
        row = CompanySettings(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)

    return row


@app.get("/branding", response_model=BrandingOut)
def read_branding(db: Session = Depends(get_db)):
    # Público: el login necesita logo y colores antes de iniciar sesión
    return get_branding(db)


@app.put("/branding", response_model=BrandingOut)
def update_branding(
    data: BrandingUpdate,
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    row = get_branding(db)

    row.company_name = data.company_name.strip()
    row.primary_color = data.primary_color.lower()
    row.sidebar_color = data.sidebar_color.lower()

    db.commit()
    db.refresh(row)

    return row


@app.put("/branding/logo", response_model=BrandingOut)
def set_logo(
    data: AvatarInput,
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    validate_avatar(data.avatar)  # mismas reglas que la foto de perfil

    row = get_branding(db)
    row.logo = data.avatar
    db.commit()
    db.refresh(row)

    return row


@app.delete("/branding/logo", response_model=BrandingOut)
def remove_logo(
    _: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    row = get_branding(db)
    row.logo = None
    db.commit()
    db.refresh(row)

    return row


# =========================================================
# FRONTEND ESTÁTICO
# =========================================================

frontend_path = Path(__file__).resolve().parent / "static"
print(f"[DEBUG] frontend_path = {frontend_path}, exists={frontend_path.exists()}")

if frontend_path.exists():

    assets_path = frontend_path / "assets"

    if assets_path.exists():
        app.mount(
            "/assets",
            StaticFiles(
                directory=assets_path
            ),
            name="assets",
        )

    @app.get("/{full_path:path}")
    async def serve_frontend(
        full_path: str,
    ):

        requested_file = frontend_path / full_path

        if (
            requested_file.exists()
            and requested_file.is_file()
        ):
            return FileResponse(
                requested_file
            )

        index_file = frontend_path / "index.html"

        if index_file.exists():
            return FileResponse(
                index_file
            )

        raise HTTPException(
            status_code=404,
            detail="Página no encontrada.",
        )