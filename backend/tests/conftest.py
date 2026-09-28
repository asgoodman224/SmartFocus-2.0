"""Test setup.

Tests use an in-memory SQLite database by default. To run them against
Postgres instead, point TEST_DATABASE_URL at an empty, throwaway database:

    export TEST_DATABASE_URL=postgresql+psycopg://smartfocus:smartfocus@localhost/smartfocus_test
    uv run pytest
"""

import os
from collections.abc import Iterator
from datetime import UTC, date, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth_store import AccountRecord, InMemoryAuthStore, get_auth_store
from app.db import Base, get_session
from app.deps import get_now
from app.main import app
from app.models import User

# Tuesday, September 15 2026, 12:00 noon in New York (EDT, UTC-4).
NOW = datetime(2026, 9, 15, 16, 0, tzinfo=UTC)
TODAY = date(2026, 9, 15)
TIMEZONE = "America/New_York"
PASSWORD = "correct horse battery"


@pytest.fixture
def session_factory() -> Iterator[sessionmaker[Session]]:
    url = os.environ.get("TEST_DATABASE_URL")
    if url:
        engine = create_engine(url)
    else:
        engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.drop_all(engine)
    engine.dispose()


class _TestAuthStore(InMemoryAuthStore):
    """In-memory accounts, plus the `users` row the data tables' foreign keys expect.

    Stands in until the database-backed AuthStore exists; see app/auth_store.py.
    """

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        super().__init__()
        self._session_factory = session_factory

    def create_account(self, email: str, password_hash: str, timezone: str, **kwargs):
        account: AccountRecord = super().create_account(email, password_hash, timezone, **kwargs)
        with self._session_factory() as session:
            session.add(User(id=account.id, timezone=timezone))
            session.commit()
        return account


@pytest.fixture
def anon_client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    """A client with no account signed in."""

    def override_session() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    store = _TestAuthStore(session_factory)
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_auth_store] = lambda: store
    app.dependency_overrides[get_now] = lambda: NOW
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def sign_up(client: TestClient, email: str, timezone: str = TIMEZONE) -> dict[str, Any]:
    response = client.post(
        "/v1/auth/sign-up", json={"email": email, "password": PASSWORD, "timezone": timezone}
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def account(anon_client: TestClient) -> dict[str, Any]:
    """Signs up a user; its token is then sent with every request from `client`."""
    body = sign_up(anon_client, "sam@example.com")
    anon_client.headers["Authorization"] = f"Bearer {body['token']}"
    return body["account"]


@pytest.fixture
def client(anon_client: TestClient, account: dict[str, Any]) -> TestClient:
    """A client signed in as `account`."""
    return anon_client


def app_entry(
    app_id: str, seconds: int, *, category: str = "social", opens: int = 1
) -> dict[str, Any]:
    return {
        "appId": app_id,
        "appName": app_id.title(),
        "category": category,
        "seconds": seconds,
        "opens": opens,
    }


def upload_day(
    client: TestClient,
    day: date,
    hours: list[dict[str, Any]],
    *,
    longest_focus_minutes: int = 60,
) -> None:
    response = client.put(
        f"/v1/usage/days/{day.isoformat()}",
        json={"longestFocusMinutes": longest_focus_minutes, "hours": hours},
    )
    assert response.status_code == 204, response.text


def hour_entry(
    hour: int, *, pickups: int = 0, notifications: int = 0, apps: list[dict[str, Any]] | None = None
) -> dict[str, Any]:
    return {"hour": hour, "pickups": pickups, "notifications": notifications, "apps": apps or []}
