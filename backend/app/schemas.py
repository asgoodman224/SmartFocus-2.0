"""API request and response shapes.

These mirror the TypeScript types in the mobile app's `src/types/models.ts`.
Python fields are snake_case; JSON is camelCase through `alias_generator`.
Keep both files in sync when either changes.

TypeScript distinguishes `field?: T` (key may be absent) from `field: T | null`.
`Omittable` fields match the first: they are left out of the JSON when None.
"""

from datetime import UTC, date, datetime
from functools import cache
from typing import Annotated, Literal
from zoneinfo import available_timezones

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, field_validator
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


def _is_none(value: object) -> bool:
    return value is None


Omittable = Field(default=None, exclude_if=_is_none)

UsageCategory = Literal["productivity", "communication", "social", "entertainment", "other"]
TimeRange = Literal["day", "week", "month"]
Rating = Annotated[int, Field(ge=1, le=5)]


def _as_utc(value: datetime) -> datetime:
    # SQLite (used in tests) returns naive datetimes; everything is stored as UTC.
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


UtcDateTime = Annotated[datetime, AfterValidator(_as_utc)]


# --- Accounts ----------------------------------------------------------------


@cache
def _known_timezones() -> frozenset[str]:
    return frozenset(available_timezones())


def _check_timezone(value: str) -> str:
    if value not in _known_timezones():
        raise ValueError("must be an IANA time zone name, e.g. America/New_York")
    return value


TimeZoneName = Annotated[str, AfterValidator(_check_timezone)]
# Lowercased so "Sam@Example.com" and "sam@example.com" are the same account.
Email = Annotated[EmailStr, AfterValidator(str.lower)]


class SignUpRequest(CamelModel):
    """POST /v1/auth/sign-up"""

    email: Email
    password: str = Field(min_length=8, max_length=128)
    timezone: TimeZoneName


class SignInRequest(CamelModel):
    """POST /v1/auth/sign-in. `timezone` updates the account's if the phone has moved."""

    email: Email
    password: str = Field(max_length=128)
    timezone: TimeZoneName | None = None


class Account(CamelModel):
    id: str
    email: str
    timezone: str


class AccountUpdate(CamelModel):
    """PATCH /v1/me"""

    timezone: TimeZoneName


class AuthResponse(CamelModel):
    token: str
    account: Account


# --- Summary and usage -------------------------------------------------------


class DailySummary(CamelModel):
    """GET /v1/summary/today"""

    date: date
    focus_score: int
    focus_score_change: int
    screen_time_minutes: int
    screen_time_change_pct: int
    pickups: int
    pickups_change_pct: int
    notifications: int
    longest_focus_minutes: int
    has_checked_in_today: bool


class DailyUsagePoint(CamelModel):
    date: date
    screen_time_minutes: int


class CategoryUsage(CamelModel):
    category: UsageCategory
    minutes: int


class AppUsage(CamelModel):
    id: str
    app_name: str
    category: UsageCategory
    minutes: int
    opens: int


class UsageBucket(CamelModel):
    key: str
    label: str
    minutes: int


class ActivityReport(CamelModel):
    """GET /v1/activity?range="""

    range: TimeRange
    total_minutes: int
    daily_average_minutes: int
    pickups: int
    notifications: int
    timeline: list[UsageBucket]
    categories: list[CategoryUsage]
    top_apps: list[AppUsage]


# --- Usage upload (phone → server) ------------------------------------------
# Not used by the app yet. The phone will call this once it can read usage.


class AppUsageUpload(CamelModel):
    app_id: str = Field(min_length=1, max_length=255)
    app_name: str = Field(min_length=1, max_length=255)
    category: UsageCategory
    seconds: int = Field(ge=0, le=3600)
    opens: int = Field(ge=0)


class UsageHourUpload(CamelModel):
    hour: int = Field(ge=0, le=23)
    pickups: int = Field(ge=0)
    notifications: int = Field(ge=0)
    apps: list[AppUsageUpload] = []

    @field_validator("apps")
    @classmethod
    def unique_apps(cls, apps: list[AppUsageUpload]) -> list[AppUsageUpload]:
        if len({app.app_id for app in apps}) != len(apps):
            raise ValueError("each appId may appear only once per hour")
        return apps


class UsageDayUpload(CamelModel):
    """PUT /v1/usage/days/{date}: replaces everything stored for that local date."""

    longest_focus_minutes: int = Field(ge=0, le=1440)
    hours: list[UsageHourUpload] = Field(max_length=24)

    @field_validator("hours")
    @classmethod
    def unique_hours(cls, hours: list[UsageHourUpload]) -> list[UsageHourUpload]:
        if len({h.hour for h in hours}) != len(hours):
            raise ValueError("each hour may appear only once")
        return hours


# --- Insights ----------------------------------------------------------------

InsightKind = Literal["pattern", "correlation", "milestone", "suggestion"]


class Insight(CamelModel):
    id: str
    kind: InsightKind
    title: str
    body: str
    created_at: UtcDateTime
    metric_value: str | None = Omittable
    metric_label: str | None = Omittable


class ScorePoint(CamelModel):
    key: str
    label: str
    value: int


class InsightsReport(CamelModel):
    """GET /v1/insights?range="""

    range: TimeRange
    average_focus_score: int
    focus_score_change: int
    average_mood: float | None
    check_in_count: int
    focus_trend: list[ScorePoint]
    insights: list[Insight]


# --- Check-ins ---------------------------------------------------------------


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    return value.strip() or None


class CheckInCreate(CamelModel):
    """POST /v1/check-ins"""

    mood: Rating
    energy: Rating
    focus: Rating
    note: Annotated[str | None, AfterValidator(_blank_to_none)] = Field(
        default=None, max_length=280
    )


class CheckIn(CamelModel):
    id: str
    created_at: UtcDateTime
    mood: Rating
    energy: Rating
    focus: Rating
    note: str | None = Omittable


# --- Data sources ------------------------------------------------------------

DataSourceId = Literal["appUsage", "notifications", "motion"]
DataSourceStatus = Literal["connected", "notConnected", "unavailable"]


class DataSource(CamelModel):
    """GET /v1/data-sources"""

    id: DataSourceId
    label: str
    description: str
    status: DataSourceStatus


class DataSourceUpdate(CamelModel):
    """PUT /v1/data-sources/{id}"""

    status: DataSourceStatus
