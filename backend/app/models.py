"""Database tables (SQLAlchemy ORM).

Usage data is stored per *local* calendar date and hour, exactly as the phone
reports it, so "today" and "8 PM" always mean the user's own clock. Check-ins
are stored as UTC timestamps and converted with the user's time zone on read.
"""

import datetime as dt
import uuid

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    SmallInteger,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def new_id() -> str:
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    timezone: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class CheckIn(Base):
    __tablename__ = "check_ins"
    __table_args__ = (
        Index("ix_check_ins_user_id_created_at", "user_id", "created_at"),
        *(
            CheckConstraint(f"{name} BETWEEN 1 AND 5", name=f"ck_check_ins_{name}_range")
            for name in ("mood", "energy", "focus")
        ),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    mood: Mapped[int] = mapped_column(SmallInteger)
    energy: Mapped[int] = mapped_column(SmallInteger)
    focus: Mapped[int] = mapped_column(SmallInteger)
    note: Mapped[str | None] = mapped_column(String(280))


class UsageDay(Base):
    """One uploaded day of phone usage. Its hours and apps are replaced as a unit."""

    __tablename__ = "usage_days"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    date: Mapped[dt.date] = mapped_column(primary_key=True)
    longest_focus_minutes: Mapped[int] = mapped_column(Integer)

    hours: Mapped[list["UsageHour"]] = relationship(cascade="all, delete-orphan")
    apps: Mapped[list["AppUsage"]] = relationship(cascade="all, delete-orphan")


class UsageHour(Base):
    """Device-level counts for one local hour."""

    __tablename__ = "usage_hours"
    __table_args__ = (
        ForeignKeyConstraint(
            ["user_id", "date"], ["usage_days.user_id", "usage_days.date"], ondelete="CASCADE"
        ),
        CheckConstraint("hour BETWEEN 0 AND 23", name="ck_usage_hours_hour_range"),
    )

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    date: Mapped[dt.date] = mapped_column(primary_key=True)
    hour: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    pickups: Mapped[int] = mapped_column(Integer)
    notifications: Mapped[int] = mapped_column(Integer)


class AppUsage(Base):
    """Time spent in one app during one local hour."""

    __tablename__ = "app_usage"
    __table_args__ = (
        ForeignKeyConstraint(
            ["user_id", "date"], ["usage_days.user_id", "usage_days.date"], ondelete="CASCADE"
        ),
        CheckConstraint("hour BETWEEN 0 AND 23", name="ck_app_usage_hour_range"),
    )

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    date: Mapped[dt.date] = mapped_column(primary_key=True)
    hour: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    app_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    app_name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(16))
    seconds: Mapped[int] = mapped_column(Integer)
    opens: Mapped[int] = mapped_column(Integer)


class DataSourceSetting(Base):
    """Whether the user has granted a phone signal (app usage, notifications, ...)."""

    __tablename__ = "data_source_settings"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    source_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    status: Mapped[str] = mapped_column(String(16))
