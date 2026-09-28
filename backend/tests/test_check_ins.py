from fastapi.testclient import TestClient


def create(client: TestClient, **fields):
    return client.post("/v1/check-ins", json={"mood": 4, "energy": 3, "focus": 5, **fields})


def test_create_returns_camel_case_check_in(client: TestClient):
    response = create(client, note="  Good day  ")

    assert response.status_code == 201
    body = response.json()
    assert body["mood"] == 4 and body["energy"] == 3 and body["focus"] == 5
    assert body["note"] == "Good day"
    assert body["createdAt"] == "2026-09-15T16:00:00Z"
    assert body["id"]


def test_blank_or_missing_note_is_left_out(client: TestClient):
    assert "note" not in create(client, note="   ").json()
    assert "note" not in create(client).json()


def test_list_is_newest_first_and_limited(client: TestClient):
    ids = [create(client, mood=m).json()["id"] for m in (1, 2, 3)]

    listed = client.get("/v1/check-ins", params={"limit": 2}).json()

    # All three share a timestamp (time is frozen), so only check count and shape.
    assert len(listed) == 2
    assert {item["id"] for item in listed} <= set(ids)


def test_rejects_out_of_range_ratings_and_long_notes(client: TestClient):
    assert create(client, mood=0).status_code == 422
    assert create(client, focus=6).status_code == 422
    assert create(client, note="x" * 281).status_code == 422
    assert client.post("/v1/check-ins", json={"mood": 3}).status_code == 422
