from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.deps import get_now
from app.main import app
from tests.conftest import NOW, PASSWORD, TODAY, app_entry, hour_entry, sign_up, upload_day

PROTECTED = [
    ("GET", "/v1/me"),
    ("GET", "/v1/summary/today"),
    ("GET", "/v1/usage/daily"),
    ("GET", "/v1/activity"),
    ("GET", "/v1/insights"),
    ("GET", "/v1/check-ins"),
    ("POST", "/v1/check-ins"),
    ("GET", "/v1/data-sources"),
    ("PUT", "/v1/data-sources/motion"),
    ("PUT", f"/v1/usage/days/{TODAY.isoformat()}"),
]


def sign_in(client: TestClient, email: str, password: str = PASSWORD, **extra):
    return client.post("/v1/auth/sign-in", json={"email": email, "password": password, **extra})


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize(("method", "path"), PROTECTED)
def test_endpoints_require_sign_in(anon_client: TestClient, method: str, path: str):
    response = anon_client.request(method, path)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"

    bad_token = anon_client.request(method, path, headers=auth("not-a-real-token"))
    assert bad_token.status_code == 401


def test_sign_up_returns_token_and_account(anon_client: TestClient):
    body = sign_up(anon_client, "Sam@Example.com", timezone="Europe/Berlin")

    assert body["token"]
    assert body["account"]["email"] == "sam@example.com"
    assert body["account"]["timezone"] == "Europe/Berlin"
    me = anon_client.get("/v1/me", headers=auth(body["token"])).json()
    assert me == body["account"]
    assert "password" not in str(me).lower()


def test_sign_up_validation(anon_client: TestClient):
    def attempt(**fields):
        payload = {"email": "a@example.com", "password": PASSWORD, "timezone": "UTC", **fields}
        return anon_client.post("/v1/auth/sign-up", json=payload)

    assert attempt(email="not-an-email").status_code == 422
    assert attempt(password="short").status_code == 422
    assert attempt(timezone="Mars/Olympus_Mons").status_code == 422
    assert attempt().status_code == 201


def test_duplicate_email_is_rejected_case_insensitively(anon_client: TestClient):
    sign_up(anon_client, "sam@example.com")

    response = anon_client.post(
        "/v1/auth/sign-up",
        json={"email": "SAM@example.com", "password": PASSWORD, "timezone": "UTC"},
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_sign_in(anon_client: TestClient):
    sign_up(anon_client, "sam@example.com")

    response = sign_in(anon_client, "SAM@example.com", timezone="Asia/Tokyo")

    assert response.status_code == 200
    body = response.json()
    assert body["account"]["timezone"] == "Asia/Tokyo"
    assert anon_client.get("/v1/me", headers=auth(body["token"])).status_code == 200


def test_sign_in_failures_share_one_message(anon_client: TestClient):
    sign_up(anon_client, "sam@example.com")

    wrong_password = sign_in(anon_client, "sam@example.com", "wrong password")
    unknown_email = sign_in(anon_client, "nobody@example.com")

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert (
        wrong_password.json() == unknown_email.json() == {"detail": "Incorrect email or password."}
    )


def test_sign_out_ends_only_that_session(anon_client: TestClient):
    phone = sign_up(anon_client, "sam@example.com")["token"]
    tablet = sign_in(anon_client, "sam@example.com").json()["token"]

    assert anon_client.post("/v1/auth/sign-out", headers=auth(phone)).status_code == 204

    assert anon_client.get("/v1/me", headers=auth(phone)).status_code == 401
    assert anon_client.get("/v1/me", headers=auth(tablet)).status_code == 200


def test_sign_out_needs_a_token_but_is_idempotent(anon_client: TestClient):
    assert anon_client.post("/v1/auth/sign-out").status_code == 401
    # An unknown or already-ended session is fine: the app can always clear its token.
    assert anon_client.post("/v1/auth/sign-out", headers=auth("stale")).status_code == 204


def test_sessions_expire(anon_client: TestClient):
    token = sign_up(anon_client, "sam@example.com")["token"]

    app.dependency_overrides[get_now] = lambda: NOW + timedelta(days=89)
    assert anon_client.get("/v1/me", headers=auth(token)).status_code == 200
    app.dependency_overrides[get_now] = lambda: NOW + timedelta(days=91)
    assert anon_client.get("/v1/me", headers=auth(token)).status_code == 401


def test_update_timezone(client: TestClient):
    response = client.patch("/v1/me", json={"timezone": "America/Los_Angeles"})

    assert response.status_code == 200
    assert response.json()["timezone"] == "America/Los_Angeles"
    assert client.patch("/v1/me", json={"timezone": "Nowhere"}).status_code == 422


def test_users_only_see_their_own_data(anon_client: TestClient):
    sam = auth(sign_up(anon_client, "sam@example.com")["token"])
    alex = auth(sign_up(anon_client, "alex@example.com")["token"])

    anon_client.post("/v1/check-ins", json={"mood": 5, "energy": 5, "focus": 5}, headers=sam)
    anon_client.put("/v1/data-sources/appUsage", json={"status": "connected"}, headers=sam)
    anon_client.headers.update(sam)
    upload_day(anon_client, TODAY, [hour_entry(9, pickups=3, apps=[app_entry("a", 600)])])
    del anon_client.headers["Authorization"]

    assert anon_client.get("/v1/check-ins", headers=alex).json() == []
    assert anon_client.get("/v1/summary/today", headers=alex).json()["pickups"] == 0
    assert anon_client.get("/v1/activity", headers=alex).json()["totalMinutes"] == 0
    statuses = {s["status"] for s in anon_client.get("/v1/data-sources", headers=alex).json()}
    assert statuses == {"notConnected"}

    assert len(anon_client.get("/v1/check-ins", headers=sam).json()) == 1
    assert anon_client.get("/v1/summary/today", headers=sam).json()["pickups"] == 3
