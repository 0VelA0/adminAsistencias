from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Text
)
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
    )

    role: Mapped[str] = mapped_column(
        String(20),
        default="employee",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    hire_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    avatar: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "work_date",
            "kind",
            name="uq_attendance_user_date_kind",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
    )

    kind: Mapped[str] = mapped_column(
        String(10),
    )

    work_date: Mapped[date] = mapped_column(
        Date,
        index=True,
    )

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    latitude: Mapped[float] = mapped_column(
        Float,
    )

    longitude: Mapped[float] = mapped_column(
        Float,
    )

    accuracy_meters: Mapped[float] = mapped_column(
        Float,
    )

    distance_meters: Mapped[float] = mapped_column(
        Float,
    )

    source: Mapped[str] = mapped_column(
        String(20),
        default="employee",
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="normal",
    )

    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    note: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )


class VacationRequest(Base):
    __tablename__ = "vacation_requests"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        index=True,
    )

    end_date: Mapped[date] = mapped_column(
        Date,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        index=True,
    )

    request_type: Mapped[str] = mapped_column(
        String(20),
        default="employee",
    )

    reason: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    admin_note: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    reviewed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class QrSession(Base):
    __tablename__ = "qr_sessions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    code: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )

    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
    )

class PermissionRequest(Base):
    __tablename__ = "permission_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
    )

    kind: Mapped[str] = mapped_column(String(10))  # paid | unpaid

    start_date: Mapped[date] = mapped_column(Date, index=True)
    end_date: Mapped[date] = mapped_column(Date, index=True)

    reason: Mapped[str] = mapped_column(String(500))

    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        index=True,
    )

    admin_note: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    reviewed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

## UserSettings

class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        index=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    notify_attendance: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_vacations: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_permissions: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_company: Mapped[bool] = mapped_column(Boolean, default=False)
    notify_weekly: Mapped[bool] = mapped_column(Boolean, default=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

class CompanySettings(Base):
    __tablename__ = "company_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    company_name: Mapped[str] = mapped_column(
        String(120),
        default="Integradora Profesional",
    )

    logo: Mapped[str | None] = mapped_column(Text, nullable=True)

    primary_color: Mapped[str] = mapped_column(String(7), default="#2463d4")
    sidebar_color: Mapped[str] = mapped_column(String(7), default="#071526")

class Notification(Base):
    __tablename__ = "notifications"

    __table_args__ = (
        UniqueConstraint("user_id", "dedupe_key", name="uq_notification_user_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(150))
    body: Mapped[str] = mapped_column(String(500))
    page: Mapped[str] = mapped_column(String(30))
    dedupe_key: Mapped[str] = mapped_column(String(120))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

class Space(Base):
    __tablename__ = "spaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    kind: Mapped[str] = mapped_column(String(60))
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    equipment: Mapped[str] = mapped_column(String(900), default="")
    open_minutes: Mapped[int] = mapped_column(Integer, default=480)
    close_minutes: Mapped[int] = mapped_column(Integer, default=1140)
    open_days: Mapped[str] = mapped_column(String(20), default="0,1,2,3,4")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class SpaceBooking(Base):
    __tablename__ = "space_bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    space_id: Mapped[int] = mapped_column(ForeignKey("spaces.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    booking_date: Mapped[date] = mapped_column(Date, index=True)
    start_minutes: Mapped[int] = mapped_column(Integer)
    end_minutes: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="confirmed", index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )