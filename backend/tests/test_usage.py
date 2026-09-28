from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.models import CheckIn
from app.services.focus import focus_score
from tests.conftest import TODAY, app_entry, hour_entry, upload_day

YESTERDAY = TODAY - timedelta(days=1)


def test_summary_with_no_data_is_all_zeros(client: TestClient):
    body = client.get("/v1/summary/today").json()

    assert body["date"] == "2026-09-15"
    assert body["screenTimeMinutes"] == 0
    assert body["focusScore"] == 0
    assert body["hasCheckedInToday"] is False


def test_summary_totals_today(client: TestClient):
    upload_day(
        client,
        TODAY,
        [
            hour_entry(8, pickups=5, notifications=10, apps=[app_entry("instagram", 1200)]),
            hour_entry(9, pickups=3, notifications=4, apps=[app_entry("slack", 600)]),
        ],
        longest_focus_minutes=45,
    )

    body = client.get("/v1/summary/today").json()

    assert body["screenTimeMinutes"] == 30
    assert body["pickups"] == 8
    assert body["notifications"] == 14
    assert body["longestFocusMinutes"] == 45
    assert body["focusScore"] == focus_score(pickups=8, notifications=14, longest_focus_minutes=45)


def test_summary_compares_with_same_hours_of_previous_days(client: TestClient):
    # It's noon. Yesterday had 20 minutes before noon and a lot more after.
    upload_day(
        client,
        YESTERDAY,
        [
            hour_entry(9, pickups=10, apps=[app_entry("instagram", 1200)]),
            hour_entry(20, pickups=40, apps=[app_entry("youtube", 3600)]),
        ],
    )
    upload_day(client, TODAY, [hour_entry(9, pickups=5, apps=[app_entry("instagram", 1800)])])

    body = client.get("/v1/summary/today").json()

    assert body["screenTimeChangePct"] == 50  # 30 min vs 20 min by noon
    assert body["pickupsChangePct"] == -50  # 5 vs 10 by noon


def test_has_checked_in_today_uses_local_day(
    client: TestClient, account: dict, session_factory: sessionmaker[Session]
):
    # 11:30 PM New York time on the 14th is already the 15th in UTC.
    with session_factory() as session:
        session.add(
            CheckIn(
                user_id=account["id"],
                created_at=datetime(2026, 9, 15, 3, 30, tzinfo=UTC),
                mood=3,
                energy=3,
                focus=3,
            )
        )
        session.commit()

    assert client.get("/v1/summary/today").json()["hasCheckedInToday"] is False

    client.post("/v1/check-ins", json={"mood": 3, "energy": 3, "focus": 3})
    assert client.get("/v1/summary/today").json()["hasCheckedInToday"] is True


def test_upload_replaces_previous_upload(client: TestClient):
    upload_day(client, TODAY, [hour_entry(8, pickups=5, apps=[app_entry("instagram", 1200)])])
    upload_day(client, TODAY, [hour_entry(9, pickups=2, apps=[app_entry("slack", 600)])])

    body = client.get("/v1/activity", params={"range": "day"}).json()

    assert body["totalMinutes"] == 10
    assert body["pickups"] == 2
    assert [app["id"] for app in body["topApps"]] == ["slack"]


def test_upload_validation(client: TestClient):
    def put(day, payload):
        return client.put(f"/v1/usage/days/{day.isoformat()}", json=payload)

    base = {"longestFocusMinutes": 10}
    assert put(TODAY + timedelta(days=1), {**base, "hours": []}).status_code == 422
    assert put(TODAY, {**base, "hours": [hour_entry(8), hour_entry(8)]}).status_code == 422
    assert put(TODAY, {**base, "hours": [hour_entry(24)]}).status_code == 422
    duplicate_app = hour_entry(8, apps=[app_entry("a", 60), app_entry("a", 60)])
    assert put(TODAY, {**base, "hours": [duplicate_app]}).status_code == 422
    too_long = hour_entry(8, apps=[app_entry("a", 3601)])
    assert put(TODAY, {**base, "hours": [too_long]}).status_code == 422


def test_daily_usage_fills_missing_days(client: TestClient):
    upload_day(client, TODAY - timedelta(days=2), [hour_entry(10, apps=[app_entry("a", 600)])])
    upload_day(client, TODAY, [hour_entry(10, apps=[app_entry("a", 300)])])

    body = client.get("/v1/usage/daily", params={"days": 3}).json()

    assert body == [
        {"date": "2026-09-13", "screenTimeMinutes": 10},
        {"date": "2026-09-14", "screenTimeMinutes": 0},
        {"date": "2026-09-15", "screenTimeMinutes": 5},
    ]


def test_activity_day_report(client: TestClient):
    upload_day(
        client,
        TODAY,
        [
            hour_entry(
                8,
                pickups=4,
                notifications=6,
                apps=[
                    app_entry("instagram", 900, opens=3),
                    app_entry("slack", 1800, category="productivity", opens=2),
                ],
            ),
            hour_entry(9, pickups=1, apps=[app_entry("instagram", 900, opens=1)]),
        ],
    )

    body = client.get("/v1/activity", params={"range": "day"}).json()

    assert body["range"] == "day"
    assert body["totalMinutes"] == 60
    assert body["dailyAverageMinutes"] == 60
    assert body["pickups"] == 5 and body["notifications"] == 6
    assert len(body["timeline"]) == 24
    assert body["timeline"][8] == {"key": "8", "label": "8 AM", "minutes": 45}
    assert body["timeline"][0]["label"] == "12 AM"
    assert body["timeline"][12]["label"] == "12 PM"
    categories = {c["category"]: c["minutes"] for c in body["categories"]}
    assert categories == {"productivity": 30, "social": 30}
    instagram = next(app for app in body["topApps"] if app["id"] == "instagram")
    assert instagram == {
        "id": "instagram",
        "appName": "Instagram",
        "category": "social",
        "minutes": 30,
        "opens": 4,
    }


def test_activity_week_averages_only_days_with_data(client: TestClient):
    upload_day(client, TODAY - timedelta(days=3), [hour_entry(10, apps=[app_entry("a", 3600)])])
    upload_day(client, TODAY, [hour_entry(10, apps=[app_entry("a", 1800)])])

    body = client.get("/v1/activity", params={"range": "week"}).json()

    assert body["totalMinutes"] == 90
    assert body["dailyAverageMinutes"] == 45
    assert [b["key"] for b in body["timeline"]][0] == "2026-09-09"
    assert body["timeline"][-1] == {"key": "2026-09-15", "label": "Tue", "minutes": 30}


def test_activity_with_no_data_is_empty(client: TestClient):
    body = client.get("/v1/activity", params={"range": "week"}).json()

    assert body["totalMinutes"] == 0
    assert body["topApps"] == [] and body["categories"] == []
