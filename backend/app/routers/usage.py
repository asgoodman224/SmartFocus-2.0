from datetime import date

from fastapi import APIRouter, HTTPException, Query, Response, status

from app import schemas
from app.deps import CurrentUserDep, NowDep, SessionDep
from app.models import AppUsage, UsageDay, UsageHour
from app.services import reports

router = APIRouter(prefix="/v1", tags=["usage"])


@router.get("/summary/today", response_model=schemas.DailySummary)
def get_daily_summary(session: SessionDep, user: CurrentUserDep, now: NowDep):
    return reports.daily_summary(session, user, now)


@router.get("/usage/daily", response_model=list[schemas.DailyUsagePoint])
def get_daily_usage(
    session: SessionDep,
    user: CurrentUserDep,
    now: NowDep,
    days: int = Query(default=7, ge=1, le=90),
):
    """Screen time per day for the last `days` days (including today), oldest first."""
    return reports.daily_usage(session, user, now, days)


@router.get("/activity", response_model=schemas.ActivityReport)
def get_activity(
    session: SessionDep, user: CurrentUserDep, now: NowDep, range: schemas.TimeRange = "day"
):
    return reports.activity_report(session, user, now, range)


@router.put("/usage/days/{day}", status_code=status.HTTP_204_NO_CONTENT)
def put_usage_day(
    day: date,
    payload: schemas.UsageDayUpload,
    session: SessionDep,
    user: CurrentUserDep,
    now: NowDep,
):
    """Upload one local day of usage from the phone, replacing any earlier upload.

    The phone can re-send today as often as it likes; each upload overwrites
    the last, so retries are safe.
    """
    if day > reports.local_today(user, now):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Date is in the future.")

    existing = session.get(UsageDay, (user.id, day))
    if existing is not None:
        session.delete(existing)
        session.flush()

    session.add(
        UsageDay(
            user_id=user.id,
            date=day,
            longest_focus_minutes=payload.longest_focus_minutes,
            hours=[
                UsageHour(hour=h.hour, pickups=h.pickups, notifications=h.notifications)
                for h in payload.hours
            ],
            apps=[
                AppUsage(
                    hour=h.hour,
                    app_id=a.app_id,
                    app_name=a.app_name,
                    category=a.category,
                    seconds=a.seconds,
                    opens=a.opens,
                )
                for h in payload.hours
                for a in h.apps
            ],
        )
    )
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
