from datetime import datetime, timedelta
from math import asin, cos, radians, sin, sqrt
import secrets
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import settings
from .database import Base, SessionLocal, engine, get_db
from .models import AttendanceRecord, QrSession, User
from .schemas import AttendanceAdminOut, AttendanceInput, AttendanceOut, LoginInput, QrAttendanceInput, QrOut, TokenOut, UserCreate, UserOut
from .security import create_token, decode_token, hash_password, verify_password

app = FastAPI(title="API de asistencia móvil", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
bearer = HTTPBearer()


def distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6_371_000
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * radius * asin(sqrt(a))


def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> User:
    payload = decode_token(credentials.credentials)
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario no disponible")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    return user


@app.on_event("startup")
def create_tables_and_admin():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        exists = db.scalar(select(User).where(User.email == settings.initial_admin_email))
        if not exists:
            db.add(User(email=settings.initial_admin_email, full_name="Administrador", password_hash=hash_password(settings.initial_admin_password), role="admin"))
            db.commit()
        initial_staff = [
            ("Lily", "lily@integraprofesional.com", "admin"),
            ("Norma", "norma@integraprofesional.com", "employee"),
            ("Angel", "angel@integraprofesional.com", "employee"),
            ("Jesus", "jesus@integraprofesional.com", "employee"),
            ("Jhonny", "jhonny@integraprofesional.com", "employee"),
            ("Cindy", "cindy@integraprofesional.com", "employee"),
            ("Raul", "raul@integraprofesional.com", "employee"),
            ("Vela", "vela@integraprofesional.com", "admin"),
        ]
        for full_name, email, role in initial_staff:
            if not db.scalar(select(User).where(User.email == email)):
                db.add(User(email=email, full_name=full_name, password_hash=hash_password(settings.employee_initial_password), role=role))
        db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/login", response_model=TokenOut)
def login(data: LoginInput, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos")
    return {"access_token": create_token(user.id, user.role), "user": user}


@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@app.get("/users", response_model=list[UserOut])
def users(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.full_name)).all()


@app.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    if data.role not in {"admin", "employee"}:
        raise HTTPException(status_code=400, detail="Rol inválido")
    if db.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(status_code=409, detail="Ese correo ya existe")
    user = User(email=data.email, full_name=data.full_name, password_hash=hash_password(settings.employee_initial_password), role=data.role)
    db.add(user); db.commit(); db.refresh(user)
    return user


@app.post("/attendance/{kind}", response_model=AttendanceOut)
def register_attendance(kind: str, data: AttendanceInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if kind not in {"entry", "exit"}:
        raise HTTPException(status_code=400, detail="Tipo de registro inválido")
    distance = distance_meters(data.latitude, data.longitude, settings.company_latitude, settings.company_longitude)
    if distance > settings.allowed_radius_meters + data.accuracy_meters:
        raise HTTPException(status_code=403, detail=f"Estás fuera de la zona permitida ({distance:.0f} m de distancia)")
    record = AttendanceRecord(user_id=user.id, kind=kind, latitude=data.latitude, longitude=data.longitude, accuracy_meters=data.accuracy_meters, distance_meters=distance)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/attendance/mine", response_model=list[AttendanceOut])
def my_attendance(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(AttendanceRecord).where(AttendanceRecord.user_id == user.id).order_by(AttendanceRecord.recorded_at.desc())).all()


@app.get("/attendance", response_model=list[AttendanceAdminOut])
def all_attendance(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows = db.execute(select(AttendanceRecord, User).join(User, AttendanceRecord.user_id == User.id).order_by(AttendanceRecord.recorded_at.desc())).all()
    return [{**{"id": record.id, "kind": record.kind, "recorded_at": record.recorded_at, "distance_meters": record.distance_meters, "accuracy_meters": record.accuracy_meters}, "user_name": user.full_name, "user_email": user.email} for record, user in rows]


@app.post("/qr-sessions", response_model=QrOut, status_code=201)
def create_qr_session(user: User = Depends(admin_user), db: Session = Depends(get_db)):
    session = QrSession(code=secrets.token_urlsafe(24), expires_at=datetime.utcnow() + timedelta(seconds=60), created_by_id=user.id)
    db.add(session); db.commit(); db.refresh(session)
    return session


@app.post("/qr-attendance", response_model=AttendanceOut)
def register_from_qr(data: QrAttendanceInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if data.station != settings.attendance_station_code:
        raise HTTPException(status_code=400, detail="Estación de asistencia no válida")
    distance = distance_meters(data.latitude, data.longitude, settings.company_latitude, settings.company_longitude)
    if distance > settings.allowed_radius_meters + data.accuracy_meters:
        raise HTTPException(status_code=403, detail="Estás fuera de la zona permitida")
    last = db.scalar(select(AttendanceRecord).where(AttendanceRecord.user_id == user.id).order_by(AttendanceRecord.recorded_at.desc()))
    kind = "exit" if last and last.kind == "entry" else "entry"
    record = AttendanceRecord(user_id=user.id, kind=kind, latitude=data.latitude, longitude=data.longitude, accuracy_meters=data.accuracy_meters, distance_meters=distance)
    db.add(record); db.commit(); db.refresh(record)
    return record


# El Docker de despliegue añade aquí el build de React. Esta ruta se registra al final
# para que las rutas de la API conserven prioridad.
app.mount("/", StaticFiles(directory="app/static", html=True, check_dir=False), name="frontend")
