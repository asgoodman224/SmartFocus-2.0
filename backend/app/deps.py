from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth_store import AccountRecord, AuthStore, get_auth_store
from app.db import get_session
from app.services import auth

SessionDep = Annotated[Session, Depends(get_session)]


def get_now() -> datetime:
    """The current time. Tests override this to pin "today"."""
    return datetime.now(UTC)


NowDep = Annotated[datetime, Depends(get_now)]
AuthStoreDep = Annotated[AuthStore, Depends(get_auth_store)]

_bearer = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """The bearer token from `Authorization: Bearer <token>`."""
    if credentials is None:
        raise _unauthorized()
    return credentials.credentials


TokenDep = Annotated[str, Depends(get_token)]


def get_current_user(store: AuthStoreDep, token: TokenDep, now: NowDep) -> AccountRecord:
    """The signed-in account making the request. 401 if the token is missing or expired."""
    account = auth.account_for_token(store, token, now)
    if account is None:
        raise _unauthorized()
    return account


CurrentUserDep = Annotated[AccountRecord, Depends(get_current_user)]
