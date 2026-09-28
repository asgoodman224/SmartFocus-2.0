"""Passwords and sign-in sessions.

A session token is 32 random bytes handed to the app once. Storage only keeps
its SHA-256, so leaked storage can't be used to sign in, and signing out
(deleting the session) takes effect immediately.
"""

import hashlib
import secrets
from datetime import datetime, timedelta

from pwdlib import PasswordHash

from app.auth_store import AccountRecord, AuthStore, InMemoryAuthStore, SessionRecord
from app.config import get_settings

_passwords = PasswordHash.recommended()  # Argon2id
# Checked against when the email is unknown, so both failures take as long.
_DUMMY_HASH = _passwords.hash("not-a-real-password")

# Local development only (DEMO_ACCOUNT=true). Its id matches the user the
# sample-data script fills in.
DEMO_EMAIL = "demo@smartfocus.dev"
DEMO_PASSWORD = "smartfocus-demo"
DEMO_ACCOUNT_ID = "demo"


def hash_password(password: str) -> str:
    return _passwords.hash(password)


def authenticate(store: AuthStore, email: str, password: str) -> AccountRecord | None:
    account = store.get_account_by_email(email)
    if account is None:
        _passwords.verify(password, _DUMMY_HASH)
        return None
    valid, new_hash = _passwords.verify_and_update(password, account.password_hash)
    if not valid:
        return None
    if new_hash is not None:
        # Hashing parameters changed since this password was set; upgrade it.
        account = store.update_account(account.id, password_hash=new_hash)
    return account


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def start_session(store: AuthStore, account: AccountRecord, now: datetime) -> str:
    """Creates a session for `account` and returns its bearer token."""
    token = secrets.token_urlsafe(32)
    store.create_session(
        SessionRecord(
            token_hash=_hash_token(token),
            account_id=account.id,
            created_at=now,
            expires_at=now + timedelta(days=get_settings().session_days),
        )
    )
    return token


def account_for_token(store: AuthStore, token: str, now: datetime) -> AccountRecord | None:
    session = store.get_session(_hash_token(token))
    if session is None or session.expires_at <= now:
        return None
    return store.get_account(session.account_id)


def end_session(store: AuthStore, token: str) -> None:
    store.delete_session(_hash_token(token))


def add_demo_account(store: InMemoryAuthStore) -> None:
    store.create_account(
        DEMO_EMAIL,
        hash_password(DEMO_PASSWORD),
        "America/New_York",
        account_id=DEMO_ACCOUNT_ID,
    )
