# SmartFocus API

The REST API behind the SmartFocus mobile app: FastAPI, Pydantic, SQLAlchemy 2 and PostgreSQL, with Alembic for migrations.

It implements every endpoint the app's `src/services/smartfocusApi.ts` calls, returning the shapes in the app's `src/types/models.ts` (camelCase JSON).

## Getting started

Requirements: Python 3.11+, [uv](https://docs.astral.sh/uv/), and Postgres 16 (Docker is easiest).

```sh
cd backend
docker compose up -d                    # Postgres on localhost:5432
uv sync                                 # install dependencies into .venv
uv run alembic upgrade head             # create the tables
uv run python -m app.dev_seed           # optional: four weeks of sample data
uv run uvicorn app.main:app --reload --host 0.0.0.0
```

Interactive API docs: <http://localhost:8000/docs>.

To use it from the app, create `.env` in the app's root folder and restart `npx expo start`:

```
EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:8000
EXPO_PUBLIC_USE_MOCK_DATA=false
```

(`--host 0.0.0.0` is what lets a phone on your Wi-Fi reach the server.)

| Command                                 | What it does                                  |
| --------------------------------------- | --------------------------------------------- |
| `uv run pytest`                         | Run the tests (in-memory SQLite, no setup)    |
| `uv run ruff check . && uv run ruff format .` | Lint and format                         |
| `uv run alembic revision --autogenerate -m "..."` | Create a migration after changing `app/models.py` |
| `uv run alembic upgrade head`           | Apply migrations                              |

## Endpoints

| Method | Path                         | Used by                                        |
| ------ | ---------------------------- | ---------------------------------------------- |
| GET    | `/v1/summary/today`          | Home: today's focus score and totals           |
| GET    | `/v1/usage/daily?days=7`     | Home: screen time per day                      |
| GET    | `/v1/activity?range=day\|week\|month` | Activity                              |
| GET    | `/v1/insights?range=week\|month` | Insights, Home                             |
| GET    | `/v1/check-ins?limit=5`      | Check-In: recent history                       |
| POST   | `/v1/check-ins`              | Check-In: save                                 |
| GET    | `/v1/data-sources`           | Settings                                       |
| PUT    | `/v1/data-sources/{id}`      | Phone reports a permission change (not wired up in the app yet) |
| PUT    | `/v1/usage/days/{date}`      | Phone uploads a day of usage (not wired up in the app yet) |
| GET    | `/health`                    | Liveness check                                 |

### Usage uploads

The phone sends usage one local calendar day at a time, broken into hours:

```json
PUT /v1/usage/days/2026-09-15
{
  "longestFocusMinutes": 84,
  "hours": [
    {
      "hour": 8,
      "pickups": 6,
      "notifications": 11,
      "apps": [{ "appId": "com.instagram.android", "appName": "Instagram", "category": "social", "seconds": 540, "opens": 3 }]
    }
  ]
}
```

Each upload **replaces** that day, so the phone can re-send today as often as it likes and retries are safe. Every summary, chart and comparison is computed from these rows.

## How it's organized

```
app/
├── main.py          App, CORS, routers
├── config.py        Settings from environment / .env
├── db.py            Engine and per-request session
├── deps.py          Shared dependencies: session, current user, current time
├── models.py        Database tables
├── schemas.py       Request/response shapes (mirror the app's models.ts)
├── routers/         One file per area; thin, they call services
├── services/
│   ├── reports.py   Summary, activity and insights calculations
│   └── focus.py     The focus score formula
└── dev_seed.py      Sample data
migrations/          Alembic migrations
tests/               pytest; "now" is frozen so dates are predictable
```

## Things to know

- **No sign-in yet.** Every request acts as one demo user (`app/deps.py:get_current_user`). Add real authentication before storing anyone's real data; routes don't need to change.
- **Time zones.** Usage is stored by the user's *local* date and hour. Check-ins are stored in UTC and grouped by the user's time zone (`users.timezone`; for now it's copied from `DEMO_USER_TIMEZONE` when the demo user is first created).
- **Partial days.** Today's screen time and pickups are compared with the *same hours* of the previous 7 days, not their full totals.
- **Missing days** are skipped, not treated as zero, in averages and the focus trend.
- **The focus score formula is a placeholder** (`app/services/focus.py`), weighted on pickups, notifications and the longest stretch without unlocking. Tune it once there's real data.
- **Written insights** (the "What we noticed" cards) aren't generated yet; the endpoint returns an empty list and the app shows its empty state.
