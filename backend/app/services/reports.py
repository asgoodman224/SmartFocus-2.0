"""Builds the read-only reports (summary, activity, insights) from stored data.

All windows are in the user's local calendar days and end on (and include)
"today". Days with no uploaded usage are treated as missing, not as zero, so
averages and comparisons only use days the phone actually reported.
"""

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from statistics import mean
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import schemas
from app.auth_store import AccountRecord
from app.models import AppUsage, CheckIn, UsageDay, UsageHour
from app.services.focus import focus_score

RANGE_DAYS: dict[schemas.TimeRange, int] = {"day": 1, "week": 7, "month": 28}
TOP_APPS_LIMIT = 6


@dataclass(frozen=True)
class DayStats:
    screen_seconds: int
    pickups: int
    notifications: int
    longest_focus_minutes: int

    @property
    def focus_score(self) -> int:
        return focus_score(
            pickups=self.pickups,
            notifications=self.notifications,
            longest_focus_minutes=self.longest_focus_minutes,
        )


# --- Time helpers ------------------------------------------------------------


def local_now(user: AccountRecord, now: datetime) -> datetime:
    return now.astimezone(ZoneInfo(user.timezone))


def local_today(user: AccountRecord, now: datetime) -> date:
    return local_now(user, now).date()


def utc_bounds(user: AccountRecord, first: date, last: date) -> tuple[datetime, datetime]:
    """UTC [start, end) covering local days `first` through `last`."""
    tz = ZoneInfo(user.timezone)
    start = datetime.combine(first, time.min, tzinfo=tz).astimezone(UTC)
    end = datetime.combine(last + timedelta(days=1), time.min, tzinfo=tz).astimezone(UTC)
    return start, end


def date_range(first: date, last: date) -> list[date]:
    return [first + timedelta(days=i) for i in range((last - first).days + 1)]


def to_minutes(seconds: float) -> int:
    return round(seconds / 60)


def pct_change(current: float, baseline: float | None) -> int:
    if not baseline:
        return 0
    return round((current - baseline) / baseline * 100)


def hour_label(hour: int) -> str:
    return f"{hour % 12 or 12} {'AM' if hour < 12 else 'PM'}"


def weekday_label(day: date) -> str:
    return day.strftime("%a")


def month_day_label(day: date) -> str:
    return f"{day.strftime('%b')} {day.day}"


# --- Queries -----------------------------------------------------------------


def load_day_stats(
    session: Session, user_id: str, first: date, last: date, through_hour: int = 23
) -> dict[date, DayStats]:
    """Per-day totals for every day in the window that has uploaded usage.

    `through_hour` limits the totals to hours 0..through_hour of each day, to
    compare a partial "today" with the same part of earlier days.
    """
    days = session.execute(
        select(UsageDay.date, UsageDay.longest_focus_minutes).where(
            UsageDay.user_id == user_id, UsageDay.date.between(first, last)
        )
    ).all()
    counts = {
        row.date: row
        for row in session.execute(
            select(
                UsageHour.date,
                func.sum(UsageHour.pickups).label("pickups"),
                func.sum(UsageHour.notifications).label("notifications"),
            )
            .where(
                UsageHour.user_id == user_id,
                UsageHour.date.between(first, last),
                UsageHour.hour <= through_hour,
            )
            .group_by(UsageHour.date)
        )
    }
    seconds = dict(
        session.execute(
            select(AppUsage.date, func.sum(AppUsage.seconds))
            .where(
                AppUsage.user_id == user_id,
                AppUsage.date.between(first, last),
                AppUsage.hour <= through_hour,
            )
            .group_by(AppUsage.date)
        ).all()
    )

    stats: dict[date, DayStats] = {}
    for day, longest_focus in days:
        count = counts.get(day)
        stats[day] = DayStats(
            screen_seconds=int(seconds.get(day) or 0),
            pickups=int(count.pickups) if count else 0,
            notifications=int(count.notifications) if count else 0,
            longest_focus_minutes=longest_focus,
        )
    return stats


def check_ins_between(
    session: Session, user: AccountRecord, first: date, last: date
) -> list[CheckIn]:
    start, end = utc_bounds(user, first, last)
    return list(
        session.scalars(
            select(CheckIn).where(
                CheckIn.user_id == user.id, CheckIn.created_at >= start, CheckIn.created_at < end
            )
        )
    )


# --- Reports -----------------------------------------------------------------


def daily_summary(session: Session, user: AccountRecord, now: datetime) -> schemas.DailySummary:
    today = local_today(user, now)
    stats = load_day_stats(session, user.id, today - timedelta(days=1), today)
    current = stats.get(today)
    yesterday = stats.get(today - timedelta(days=1))
    # Today is only partly over, so compare it with the same hours of the last week.
    previous_week = list(
        load_day_stats(
            session,
            user.id,
            today - timedelta(days=7),
            today - timedelta(days=1),
            through_hour=local_now(user, now).hour,
        ).values()
    )

    avg_screen = mean(s.screen_seconds for s in previous_week) if previous_week else None
    avg_pickups = mean(s.pickups for s in previous_week) if previous_week else None
    has_checked_in = bool(check_ins_between(session, user, today, today))

    if current is None:
        # Nothing uploaded yet today. The app's type has no nulls here, so zeros.
        return schemas.DailySummary(
            date=today,
            focus_score=0,
            focus_score_change=0,
            screen_time_minutes=0,
            screen_time_change_pct=0,
            pickups=0,
            pickups_change_pct=0,
            notifications=0,
            longest_focus_minutes=0,
            has_checked_in_today=has_checked_in,
        )

    return schemas.DailySummary(
        date=today,
        focus_score=current.focus_score,
        focus_score_change=current.focus_score - yesterday.focus_score if yesterday else 0,
        screen_time_minutes=to_minutes(current.screen_seconds),
        screen_time_change_pct=pct_change(current.screen_seconds, avg_screen),
        pickups=current.pickups,
        pickups_change_pct=pct_change(current.pickups, avg_pickups),
        notifications=current.notifications,
        longest_focus_minutes=current.longest_focus_minutes,
        has_checked_in_today=has_checked_in,
    )


def daily_usage(
    session: Session, user: AccountRecord, now: datetime, days: int
) -> list[schemas.DailyUsagePoint]:
    """Screen time for the last `days` days, oldest first. Missing days are 0."""
    today = local_today(user, now)
    first = today - timedelta(days=days - 1)
    stats = load_day_stats(session, user.id, first, today)
    return [
        schemas.DailyUsagePoint(
            date=day,
            screen_time_minutes=to_minutes(stats[day].screen_seconds) if day in stats else 0,
        )
        for day in date_range(first, today)
    ]


def activity_report(
    session: Session, user: AccountRecord, now: datetime, range_: schemas.TimeRange
) -> schemas.ActivityReport:
    today = local_today(user, now)
    first = today - timedelta(days=RANGE_DAYS[range_] - 1)
    stats = load_day_stats(session, user.id, first, today)
    in_window = (AppUsage.user_id == user.id, AppUsage.date.between(first, today))

    if range_ == "day":
        by_hour = dict(
            session.execute(
                select(AppUsage.hour, func.sum(AppUsage.seconds))
                .where(*in_window)
                .group_by(AppUsage.hour)
            ).all()
        )
        timeline = [
            schemas.UsageBucket(
                key=str(hour), label=hour_label(hour), minutes=to_minutes(by_hour.get(hour) or 0)
            )
            for hour in range(24)
        ]
    else:
        label = weekday_label if range_ == "week" else month_day_label
        timeline = [
            schemas.UsageBucket(
                key=day.isoformat(),
                label=label(day),
                minutes=to_minutes(stats[day].screen_seconds) if day in stats else 0,
            )
            for day in date_range(first, today)
        ]

    categories = session.execute(
        select(AppUsage.category, func.sum(AppUsage.seconds).label("seconds"))
        .where(*in_window)
        .group_by(AppUsage.category)
        .order_by(func.sum(AppUsage.seconds).desc())
    ).all()
    top_apps = session.execute(
        select(
            AppUsage.app_id,
            func.max(AppUsage.app_name).label("app_name"),
            func.max(AppUsage.category).label("category"),
            func.sum(AppUsage.seconds).label("seconds"),
            func.sum(AppUsage.opens).label("opens"),
        )
        .where(*in_window)
        .group_by(AppUsage.app_id)
        .order_by(func.sum(AppUsage.seconds).desc())
        .limit(TOP_APPS_LIMIT)
    ).all()

    total_seconds = sum(s.screen_seconds for s in stats.values())
    return schemas.ActivityReport(
        range=range_,
        total_minutes=to_minutes(total_seconds),
        daily_average_minutes=to_minutes(total_seconds / len(stats)) if stats else 0,
        pickups=sum(s.pickups for s in stats.values()),
        notifications=sum(s.notifications for s in stats.values()),
        timeline=timeline,
        categories=[
            schemas.CategoryUsage(category=row.category, minutes=to_minutes(row.seconds))
            for row in categories
        ],
        top_apps=[
            schemas.AppUsage(
                id=row.app_id,
                app_name=row.app_name,
                category=row.category,
                minutes=to_minutes(row.seconds),
                opens=int(row.opens),
            )
            for row in top_apps
        ],
    )


def insights_report(
    session: Session, user: AccountRecord, now: datetime, range_: schemas.TimeRange
) -> schemas.InsightsReport:
    today = local_today(user, now)
    length = RANGE_DAYS[range_]
    first = today - timedelta(days=length - 1)
    previous_first = first - timedelta(days=length)

    stats = load_day_stats(session, user.id, previous_first, today)
    scores = {day: s.focus_score for day, s in stats.items() if day >= first}
    previous_scores = [s.focus_score for day, s in stats.items() if day < first]

    average = round(mean(scores.values())) if scores else 0
    change = average - round(mean(previous_scores)) if scores and previous_scores else 0

    if range_ == "month":
        # One point per week, oldest first, averaging the days that have data.
        trend = []
        for week_start in (first + timedelta(days=7 * i) for i in range(length // 7)):
            week = [
                scores[d] for d in date_range(week_start, week_start + timedelta(6)) if d in scores
            ]
            if week:
                trend.append(
                    schemas.ScorePoint(
                        key=week_start.isoformat(),
                        label=month_day_label(week_start),
                        value=round(mean(week)),
                    )
                )
    else:
        trend = [
            schemas.ScorePoint(key=day.isoformat(), label=weekday_label(day), value=scores[day])
            for day in date_range(first, today)
            if day in scores
        ]

    check_ins = check_ins_between(session, user, first, today)
    return schemas.InsightsReport(
        range=range_,
        average_focus_score=average,
        focus_score_change=change,
        average_mood=round(mean(c.mood for c in check_ins), 1) if check_ins else None,
        check_in_count=len(check_ins),
        focus_trend=trend,
        # TODO: generate written insights (patterns, correlations, milestones).
        # The app shows a friendly empty state until then.
        insights=[],
    )
