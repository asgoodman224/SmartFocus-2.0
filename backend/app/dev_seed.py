"""Fill the database with four weeks of sample data for the demo user.

    uv run python -m app.dev_seed

Replaces the demo user's usage and check-ins; safe to run repeatedly. The
numbers loosely follow the mobile app's mock data so both look alike.
"""

import random
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete

from app.db import SessionLocal
from app.models import AppUsage, CheckIn, DataSourceSetting, UsageDay, UsageHour, User
from app.services.auth import DEMO_ACCOUNT_ID, DEMO_EMAIL, DEMO_PASSWORD
from app.services.reports import local_today

DAYS = 28

# Relative phone use in each local hour, midnight first.
HOUR_WEIGHTS = [2, 0, 0, 0, 0, 0, 4, 14, 12, 10, 9, 8, 16, 11, 9, 10, 12, 14, 18, 22, 24, 17, 10, 4]

# (app id, name, category, share of screen time, minutes per open)
APPS = [
    ("instagram", "Instagram", "social", 0.18, 2.3),
    ("youtube", "YouTube", "entertainment", 0.15, 6.0),
    ("slack", "Slack", "productivity", 0.13, 1.5),
    ("messages", "Messages", "communication", 0.12, 1.1),
    ("reddit", "Reddit", "social", 0.08, 2.2),
    ("gmail", "Gmail", "productivity", 0.06, 1.3),
    ("whatsapp", "WhatsApp", "communication", 0.08, 1.2),
    ("notion", "Notion", "productivity", 0.07, 4.0),
    ("spotify", "Spotify", "entertainment", 0.06, 3.0),
    ("safari", "Safari", "other", 0.07, 2.5),
]

NOTES = [
    "Productive study session in the library.",
    "Stayed up too late scrolling.",
    "Long day of classes.",
    "Went for a run, felt good.",
    None,
    None,
    None,
]


def seed() -> None:
    rng = random.Random(42)
    with SessionLocal() as session:
        # The demo account (DEMO_ACCOUNT=true) signs in as this user.
        user = session.get(User, DEMO_ACCOUNT_ID)
        if user is None:
            user = User(id=DEMO_ACCOUNT_ID, timezone="America/New_York")
            session.add(user)
        tz = ZoneInfo(user.timezone)
        now = datetime.now(UTC)
        today = local_today(user, now)
        current_hour = now.astimezone(tz).hour

        session.execute(delete(UsageDay).where(UsageDay.user_id == user.id))
        session.execute(delete(CheckIn).where(CheckIn.user_id == user.id))
        session.execute(delete(DataSourceSetting).where(DataSourceSetting.user_id == user.id))
        for source_id in ("appUsage", "notifications"):
            session.add(DataSourceSetting(user_id=user.id, source_id=source_id, status="connected"))

        for days_ago in range(DAYS - 1, -1, -1):
            day = today - timedelta(days=days_ago)
            # A gentle downward trend in screen time over the four weeks.
            daily_minutes = rng.uniform(200, 320) + days_ago * 1.2
            last_hour = current_hour if days_ago == 0 else 23
            usage_day = UsageDay(
                user_id=user.id, date=day, longest_focus_minutes=rng.randint(35, 110)
            )
            for hour in range(last_hour + 1):
                minutes = daily_minutes * HOUR_WEIGHTS[hour] / sum(HOUR_WEIGHTS)
                minutes *= rng.uniform(0.6, 1.4)
                usage_day.hours.append(
                    UsageHour(
                        hour=hour,
                        pickups=round(minutes * rng.uniform(0.2, 0.35)),
                        notifications=round(minutes * rng.uniform(0.35, 0.7)) + rng.randint(0, 2),
                    )
                )
                for app_id, name, category, share, per_open in APPS:
                    seconds = round(minutes * share * rng.uniform(0.3, 1.7) * 60)
                    if seconds < 30:
                        continue
                    usage_day.apps.append(
                        AppUsage(
                            hour=hour,
                            app_id=app_id,
                            app_name=name,
                            category=category,
                            seconds=min(seconds, 3600),
                            opens=max(1, round(seconds / 60 / per_open)),
                        )
                    )
            session.add(usage_day)

            if days_ago > 0 and rng.random() < 0.7:
                local_time = time(rng.randint(19, 22), rng.randint(0, 59))
                session.add(
                    CheckIn(
                        user_id=user.id,
                        created_at=datetime.combine(day, local_time, tzinfo=tz).astimezone(UTC),
                        mood=rng.randint(2, 5),
                        energy=rng.randint(1, 5),
                        focus=rng.randint(2, 5),
                        note=rng.choice(NOTES),
                    )
                )

        session.commit()
        print(f"Seeded {DAYS} days of sample data for user '{user.id}' ({user.timezone}).")
        print(f"With DEMO_ACCOUNT=true, sign in as {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed()
