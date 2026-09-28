from typing import get_args

from fastapi import APIRouter
from sqlalchemy import select

from app import schemas
from app.deps import CurrentUserDep, SessionDep
from app.models import DataSourceSetting

router = APIRouter(prefix="/v1/data-sources", tags=["data-sources"])

# Display text lives here so every client shows the same wording.
DATA_SOURCES: dict[schemas.DataSourceId, tuple[str, str]] = {
    "appUsage": ("App usage", "Time spent in apps and how often you pick up your phone."),
    "notifications": (
        "Notification activity",
        "How many notifications you receive. Never their content.",
    ),
    "motion": ("Physical activity", "Steps and movement from your phone's motion sensors."),
}
assert set(DATA_SOURCES) == set(get_args(schemas.DataSourceId))


def _statuses(session: SessionDep, user_id: str) -> dict[str, str]:
    rows = session.execute(
        select(DataSourceSetting.source_id, DataSourceSetting.status).where(
            DataSourceSetting.user_id == user_id
        )
    )
    return dict(rows.all())


def _to_schema(source_id: schemas.DataSourceId, status: str) -> schemas.DataSource:
    label, description = DATA_SOURCES[source_id]
    return schemas.DataSource(id=source_id, label=label, description=description, status=status)


@router.get("", response_model=list[schemas.DataSource])
def list_data_sources(session: SessionDep, user: CurrentUserDep):
    """Which phone signals the user has granted. Unset sources are "notConnected"."""
    statuses = _statuses(session, user.id)
    return [
        _to_schema(source_id, statuses.get(source_id, "notConnected")) for source_id in DATA_SOURCES
    ]


@router.put("/{source_id}", response_model=schemas.DataSource)
def update_data_source(
    source_id: schemas.DataSourceId,
    payload: schemas.DataSourceUpdate,
    session: SessionDep,
    user: CurrentUserDep,
):
    """Called by the phone when a permission is granted, revoked or unsupported."""
    setting = session.get(DataSourceSetting, (user.id, source_id))
    if setting is None:
        setting = DataSourceSetting(user_id=user.id, source_id=source_id)
        session.add(setting)
    setting.status = payload.status
    session.commit()
    return _to_schema(source_id, setting.status)
