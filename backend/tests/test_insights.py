from datetime import timedelta

from fastapi.testclient import TestClient

from app.services.focus import focus_score
from tests.conftest import TODAY, hour_entry, upload_day


def upload_score_day(client: TestClient, days_ago: int, pickups: int) -> int:
    """Uploads a day whose focus score depends only on `pickups`; returns that score."""
    upload_day(
        client,
        TODAY - timedelta(days=days_ago),
        [hour_entry(10, pickups=pickups)],
        longest_focus_minutes=60,
    )
    return focus_score(pickups=pickups, notifications=0, longest_focus_minutes=60)


def test_week_report_with_no_data(client: TestClient):
    body = client.get("/v1/insights", params={"range": "week"}).json()

    assert body == {
        "range": "week",
        "averageFocusScore": 0,
        "focusScoreChange": 0,
        "averageMood": None,
        "checkInCount": 0,
        "focusTrend": [],
        "insights": [],
    }


def test_week_trend_skips_missing_days_and_compares_with_previous_week(client: TestClient):
    this_week = [upload_score_day(client, 0, 10), upload_score_day(client, 2, 50)]
    last_week = upload_score_day(client, 9, 100)

    body = client.get("/v1/insights", params={"range": "week"}).json()

    assert [point["key"] for point in body["focusTrend"]] == ["2026-09-13", "2026-09-15"]
    assert body["focusTrend"][-1]["label"] == "Tue"
    average = round(sum(this_week) / 2)
    assert body["averageFocusScore"] == average
    assert body["focusScoreChange"] == average - last_week


def test_mood_and_check_in_count(client: TestClient):
    for mood in (2, 5):
        client.post("/v1/check-ins", json={"mood": mood, "energy": 3, "focus": 3})

    body = client.get("/v1/insights", params={"range": "week"}).json()

    assert body["averageMood"] == 3.5
    assert body["checkInCount"] == 2


def test_month_trend_is_weekly(client: TestClient):
    oldest_week = upload_score_day(client, 27, 30)
    newest_week = [upload_score_day(client, 0, 10), upload_score_day(client, 1, 20)]

    body = client.get("/v1/insights", params={"range": "month"}).json()

    assert body["focusTrend"] == [
        {"key": "2026-08-19", "label": "Aug 19", "value": oldest_week},
        {"key": "2026-09-09", "label": "Sep 9", "value": round(sum(newest_week) / 2)},
    ]
