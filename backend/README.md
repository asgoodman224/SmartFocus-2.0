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
cp .env.example .env                    # turns on the demo account for local use
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

Sign in to the app as `demo@smartfocus.dev` / `smartfocus-demo` to see the sample data, or create a new account.

## Endpoints

Everything except sign-up, sign-in and `/health` needs `Authorization: Bearer <token>`; without a valid token the API answers 401.

| Method | Path                         | Used by                                        |
| ------ | ---------------------------- | ---------------------------------------------- |
| POST   | `/v1/auth/sign-up`           | Create account: `{email, password, timezone}` → `{token, account}` |
| POST   | `/v1/auth/sign-in`           | Sign in: `{email, password, timezone?}` → `{token, account}` |
| POST   | `/v1/auth/sign-out`          | End this device's session                      |
| GET    | `/v1/me`                     | The signed-in account                          |
| PATCH  | `/v1/me`                     | Update the account's time zone                 |
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
│   ├── auth.py      Passwords, tokens, sessions
│   ├── reports.py   Summary, activity and insights calculations
│   └── focus.py     The focus score formula
├── auth_store.py    Account/session storage interface (the boundary with the database)
└── dev_seed.py      Sample data
migrations/          Alembic migrations
tests/               pytest; "now" is frozen so dates are predictable
```

## Things to know

- **Accounts are kept in memory for now.** Sign-in code talks to storage only through the `AuthStore` interface in `app/auth_store.py`; the database-backed version is being built separately, and that file describes what it needs. Until then accounts are forgotten when the server restarts, and new accounts can sign in but can't save data to Postgres (the data tables expect a matching `users` row). The demo account works because the sample-data script creates its row.
- **Sign-in details.** Passwords are hashed with Argon2id. Tokens are random; only their SHA-256 is stored, so sign-out takes effect immediately. Sessions last `SESSION_DAYS` (90). Sign-in errors don't reveal whether an email is registered. There's no rate limiting yet; add it (or put the API behind something that does) before going public.
- **Time zones.** The app sends the phone's time zone at sign-up and sign-in. Usage is stored by the user's *local* date and hour; check-ins are stored in UTC and grouped by the account's time zone.
- **Partial days.** Today's screen time and pickups are compared with the *same hours* of the previous 7 days, not their full totals.
- **Missing days** are skipped, not treated as zero, in averages and the focus trend.
- **The focus score formula is a placeholder** (`app/services/focus.py`), weighted on pickups, notifications and the longest stretch without unlocking. Tune it once there's real data.
- **Written insights** (the "What we noticed" cards) aren't generated yet; the endpoint returns an empty list and the app shows its empty state.
