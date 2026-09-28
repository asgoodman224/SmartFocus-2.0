from fastapi import APIRouter

from app import schemas
from app.deps import CurrentUserDep, NowDep, SessionDep
from app.services import reports

router = APIRouter(prefix="/v1/insights", tags=["insights"])


@router.get("", response_model=schemas.InsightsReport)
def get_insights(
    session: SessionDep, user: CurrentUserDep, now: NowDep, range: schemas.TimeRange = "week"
):
    return reports.insights_report(session, user, now, range)
