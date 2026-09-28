"""Storage for accounts and sign-in sessions: the boundary with the database.

The API code (routes, token checks, password hashing) only talks to the
`AuthStore` interface below. The database implementation is owned separately;
until it exists, `InMemoryAuthStore` stands in.

What a database-backed store needs
----------------------------------
Two tables, roughly:

  accounts   id (string PK), email (unique, stored lowercased),
             password_hash (string, ~100 chars; Argon2 PHC format),
             timezone (IANA name, e.g. "America/New_York"), created_at
  sessions   token_hash (64-char hex SHA-256, PK), account_id (FK -> accounts,
             delete cascade, indexed), created_at, expires_at (timestamptz)

Every per-user table (check-ins, usage, data sources) keys on the account id.
Then implement each `AuthStore` method and return it from `get_auth_store`.
`tests/test_auth.py` exercises the full contract through the API.
"""

import threading
import uuid
from dataclasses import dataclass, replace
from datetime import datetime
from functools import lru_cache
from typing import Protocol


@dataclass(frozen=True)
class AccountRecord:
    id: str
    email: str
    password_hash: str
    timezone: str


@dataclass(frozen=True)
class SessionRecord:
    token_hash: str
    account_id: str
    created_at: datetime
    expires_at: datetime


class EmailTakenError(Exception):
    """Raised by `create_account` when the email is already registered."""


class AuthStore(Protocol):
    def get_account(self, account_id: str) -> AccountRecord | None: ...

    def get_account_by_email(self, email: str) -> AccountRecord | None:
        """`email` is already lowercased."""
        ...

    def create_account(self, email: str, password_hash: str, timezone: str) -> AccountRecord:
        """Must raise `EmailTakenError` if the email exists, including under a race."""
        ...

    def update_account(
        self, account_id: str, *, password_hash: str | None = None, timezone: str | None = None
    ) -> AccountRecord:
        """Changes only the fields given."""
        ...

    def create_session(self, record: SessionRecord) -> None: ...

    def get_session(self, token_hash: str) -> SessionRecord | None: ...

    def delete_session(self, token_hash: str) -> None:
        """Deleting a session that doesn't exist is not an error."""
        ...


class InMemoryAuthStore:
    """Keeps everything in memory. For tests and local development only:
    accounts are forgotten whenever the server restarts."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._accounts: dict[str, AccountRecord] = {}
        self._sessions: dict[str, SessionRecord] = {}

    def get_account(self, account_id: str) -> AccountRecord | None:
        return self._accounts.get(account_id)

    def get_account_by_email(self, email: str) -> AccountRecord | None:
        return next((a for a in self._accounts.values() if a.email == email), None)

    def create_account(
        self, email: str, password_hash: str, timezone: str, *, account_id: str | None = None
    ) -> AccountRecord:
        with self._lock:
            if self.get_account_by_email(email) is not None:
                raise EmailTakenError(email)
            account = AccountRecord(
                id=account_id or uuid.uuid4().hex,
                email=email,
                password_hash=password_hash,
                timezone=timezone,
            )
            self._accounts[account.id] = account
            return account

    def update_account(
        self, account_id: str, *, password_hash: str | None = None, timezone: str | None = None
    ) -> AccountRecord:
        with self._lock:
            account = self._accounts[account_id]
            if password_hash is not None:
                account = replace(account, password_hash=password_hash)
            if timezone is not None:
                account = replace(account, timezone=timezone)
            self._accounts[account_id] = account
            return account

    def create_session(self, record: SessionRecord) -> None:
        self._sessions[record.token_hash] = record

    def get_session(self, token_hash: str) -> SessionRecord | None:
        return self._sessions.get(token_hash)

    def delete_session(self, token_hash: str) -> None:
        self._sessions.pop(token_hash, None)


@lru_cache
def get_auth_store() -> AuthStore:
    """FastAPI dependency. TODO: return the database-backed store once it exists."""
    from app.config import get_settings
    from app.services.auth import add_demo_account

    store = InMemoryAuthStore()
    if get_settings().demo_account:
        add_demo_account(store)
    return store
