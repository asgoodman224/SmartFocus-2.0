from fastapi.testclient import TestClient

from app.services.focus import focus_score


def test_sources_default_to_not_connected(client: TestClient):
    body = client.get("/v1/data-sources").json()

    assert [s["id"] for s in body] == ["appUsage", "notifications", "motion"]
    assert {s["status"] for s in body} == {"notConnected"}
    assert body[1]["label"] == "Notification activity"


def test_update_status(client: TestClient):
    response = client.put("/v1/data-sources/appUsage", json={"status": "connected"})
    assert response.status_code == 200
    assert response.json()["status"] == "connected"

    client.put("/v1/data-sources/appUsage", json={"status": "unavailable"})
    statuses = {s["id"]: s["status"] for s in client.get("/v1/data-sources").json()}
    assert statuses == {
        "appUsage": "unavailable",
        "notifications": "notConnected",
        "motion": "notConnected",
    }


def test_update_rejects_unknown_source_or_status(client: TestClient):
    assert client.put("/v1/data-sources/camera", json={"status": "connected"}).status_code == 422
    assert client.put("/v1/data-sources/motion", json={"status": "on"}).status_code == 422


def test_focus_score_bounds():
    assert focus_score(pickups=0, notifications=0, longest_focus_minutes=90) == 100
    assert focus_score(pickups=500, notifications=900, longest_focus_minutes=0) == 0
    # Roughly the app's mock "today" (61 pickups, 118 notifications, 84 min) lands near its 72.
    assert 65 <= focus_score(pickups=61, notifications=118, longest_focus_minutes=84) <= 78
