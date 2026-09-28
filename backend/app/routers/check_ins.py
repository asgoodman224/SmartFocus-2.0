from fastapi import APIRouter, Query, status
from sqlalchemy import select

from app import schemas
from app.deps import CurrentUserDep, NowDep, SessionDep
from app.models import CheckIn

router = APIRouter(prefix="/v1/check-ins", tags=["check-ins"])


@router.get("", response_model=list[schemas.CheckIn])
def list_check_ins(
    session: SessionDep, user: CurrentUserDep, limit: int = Query(default=5, ge=1, le=100)
):
    """Most recent check-ins, newest first."""
    return session.scalars(
        select(CheckIn)
        .where(CheckIn.user_id == user.id)
        .order_by(CheckIn.created_at.desc(), CheckIn.id.desc())
        .limit(limit)
    ).all()


@router.post("", response_model=schemas.CheckIn, status_code=status.HTTP_201_CREATED)
def create_check_in(
    payload: schemas.CheckInCreate, session: SessionDep, user: CurrentUserDep, now: NowDep
):
    check_in = CheckIn(user_id=user.id, created_at=now, **payload.model_dump())
    session.add(check_in)
    session.commit()
    return check_in
