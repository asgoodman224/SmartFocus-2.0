# SmartFocus API

The REST API behind the SmartFocus mobile app: Node.js and Express 5, with MySQL planned for storage.

It implements every endpoint the app's `src/services/smartfocusApi.ts` calls, returning the shapes in the app's `src/types/models.ts` (camelCase JSON). Errors come back as `{ "detail": "message" }`, which the app shows to users.

## Getting started

Requirements: Node.js 20+.

```sh
cd backend
npm install
cp .env.example .env      # turns on the demo account for local use
npm run dev               # restarts on file changes; `npm start` doesn't
```

The API runs on <http://localhost:3000>. Sign in to the app as `demo@smartfocus.dev` / `smartfocus-demo` to see four weeks of sample data, or create a new account.

To use it from the app, create `.env` in the app's root folder and restart `npx expo start`:

```
EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:3000
EXPO_PUBLIC_USE_MOCK_DATA=false
```

| Command       | What it does                      |
| ------------- | --------------------------------- |
| `npm run dev` | Run the API, restarting on changes |
| `npm start`   | Run the API                       |
| `npm test`    | Run the tests (no database needed) |

## Storage (MySQL)

**Data is kept in memory for now and lost when the server stops.** The database side is being built separately. The API only talks to storage through one interface, described in [`src/store/index.js`](src/store/index.js): accounts, sessions, check-ins, data-source settings and uploaded usage and health days, with the exact shapes and methods.

To connect MySQL, write `createMysqlStore(db)` implementing those methods (e.g. with the `mysql2` connection from `db.js` on the `database-api` branch), use it in `src/server.js`, and point `test/helpers.js:makeStore` at it so the test suite checks it. Nothing else needs to change. The report calculations (summary, charts, focus score) work on the day records the store returns, so the store only saves and loads data.

## Endpoints

Everything except sign-up, sign-in and `/health` needs `Authorization: Bearer <token>`; without a valid token the API answers 401.

| Method | Path                        | Used by                                         |
| ------ | --------------------------- | ----------------------------------------------- |
| POST   | `/v1/auth/sign-up`          | Create account: `{email, password, timezone}` → `{token, account}` |
| POST   | `/v1/auth/sign-in`          | Sign in: `{email, password, timezone?}` → `{token, account}` |
| POST   | `/v1/auth/sign-out`         | End this device's session                        |
| GET    | `/v1/me`                    | The signed-in account                            |
| PATCH  | `/v1/me`                    | Update the account's time zone                   |
| GET    | `/v1/summary/today`         | Home: today's focus score and totals             |
| GET    | `/v1/usage/daily?days=7`    | Home: screen time per day                        |
| GET    | `/v1/activity?range=day\|week\|month` | Activity                               |
| GET    | `/v1/insights?range=week\|month` | Insights, Home                              |
| GET    | `/v1/check-ins?limit=5`     | Check-In: recent history, newest `createdAt` first |
| POST   | `/v1/check-ins`             | Check-In: save (also uploads offline check-ins later) |
| GET    | `/v1/data-sources`          | Settings                                         |
| PUT    | `/v1/data-sources/{id}`     | Phone reports a permission change (not wired up in the app yet) |
| PUT    | `/v1/usage/days/{date}`     | Phone uploads a day of usage (not wired up in the app yet) |
| GET    | `/v1/health/daily?days=7`   | Sleep, steps, exercise and distance per day      |
| PUT    | `/v1/health/days/{date}`    | Phone uploads a day of health data               |
| GET    | `/health`                   | Liveness check                                   |

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

Each upload **replaces** that day, so the phone can re-send recent days as often as it likes and retries are safe.

### Check-ins

```json
POST /v1/check-ins
{
  "mood": 4, "energy": 3, "focus": 5,
  "note": "Slept well",
  "kind": "morning",
  "sleepQuality": 4,
  "createdAt": "2026-09-15T07:45:00-04:00"
}
```

`mood`, `energy` and `focus` (1–5) are required; the rest are optional, and `null` counts as not given. `kind` is `morning`, `midday`, `evening` or `anytime`; `sleepQuality` (1–5) answers "how did you sleep?". `createdAt` is when the user checked in on the phone, with a `Z` or offset; leave it out for "now". A phone that was offline can upload check-ins later with their original time, up to 30 days back (and at most 5 minutes ahead, for clock drift); anything else is a 422. The response (201) is the saved check-in with its `id`; `note`, `kind` and `sleepQuality` are left out when not given.

### Health uploads

The phone sends health data one local calendar day at a time. Every field is optional; a missing or `null` value means "no data that day", which is kept apart from 0:

```json
PUT /v1/health/days/2026-09-15
{ "sleepMinutes": 450, "steps": 8200, "exerciseMinutes": 35, "distanceMeters": 6100 }
```

All values are whole numbers: `sleepMinutes` and `exerciseMinutes` 0–1440, `steps` and `distanceMeters` (meters) 0 or more. Like usage, an upload **replaces** that day completely (204), and future dates are refused.

`GET /v1/health/daily?days=7` (1–90) returns one entry per day, oldest first and ending today, with `null` for days or values the phone hasn't sent:

```json
[
  { "date": "2026-09-14", "sleepMinutes": null, "steps": null, "exerciseMinutes": null, "distanceMeters": null },
  { "date": "2026-09-15", "sleepMinutes": 450, "steps": 8200, "exerciseMinutes": 35, "distanceMeters": 6100 }
]
```

## How it's organized

```
src/
├── server.js        Starts the API (picks the store, adds the demo account)
├── app.js           Express app: CORS, sign-in check, routes, error format
├── config.js        Settings from environment / .env
├── routes/          One file per area; thin, they validate and call the rest
├── validation.js    Request shapes (zod), mirroring the app's models.ts
├── auth.js          Passwords (scrypt), tokens, sessions
├── reports.js       Summary, activity, insights and daily health calculations
├── focus.js         The focus score formula
├── time.js          Time zones and calendar days (luxon)
├── demoData.js      Sample data for the demo account
└── store/           Storage interface (index.js) and the in-memory version
test/                node:test + supertest; "now" is pinned so dates are predictable
```

## Things to know

- **Sign-in.** Passwords are hashed with scrypt. Tokens are random, and only their SHA-256 is stored, so signing out takes effect immediately. Sessions last `SESSION_DAYS` (90). Sign-in errors don't reveal whether an email is registered. There's no rate limiting yet; add it before going public.
- **Time zones.** The app sends the phone's time zone at sign-up and sign-in. Usage and health data are stored by the user's *local* date (usage also by hour); check-ins are timestamps grouped by the account's time zone.
- **Partial days.** Today's screen time and pickups are compared with the *same hours* of the previous 7 days, not their full totals.
- **Missing days** are skipped, not treated as zero, in averages and the focus trend.
- **The focus score formula is a placeholder** (`src/focus.js`), weighted on pickups, notifications and the longest stretch without unlocking. Tune it once there's real data.
- **Written insights** (the "What we noticed" cards) aren't generated yet; the endpoint returns an empty list and the app shows its empty state.
