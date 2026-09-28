from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_session
from app.models import User

SessionDep = Annotated[Session, Depends(get_session)]


def get_now() -> datetime:
    """The current time. Tests override this to pin "today"."""
    return datetime.now(UTC)


NowDep = Annotated[datetime, Depends(get_now)]


def get_current_user(session: SessionDep) -> User:
    """The user making the request.

    TODO: there is no sign-in yet, so this returns a single demo user (created
    on first use). Replace it with real authentication (e.g. a bearer token)
    before storing anyone's actual data; no route code needs to change.
    """
    settings = get_settings()
    user = session.get(User, settings.demo_user_id)
    if user is not None:
        return user
    try:
        user = User(id=settings.demo_user_id, timezone=settings.demo_user_timezone)
        session.add(user)
        session.commit()
    except IntegrityError:
        # Another request created it first.
        session.rollback()
        user = session.get(User, settings.demo_user_id)
        assert user is not None
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]
