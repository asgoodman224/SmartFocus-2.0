-- SmartFocus tables (PostgreSQL). The API creates any that are missing when it
-- starts, so running this by hand is optional. Safe to run more than once.
-- Dates are the participant's local calendar day; timestamps are UTC.

CREATE TABLE IF NOT EXISTS accounts (
  id            text PRIMARY KEY,
  email         text NOT NULL UNIQUE,          -- stored lowercased
  password_hash text NOT NULL,
  timezone      text NOT NULL,                 -- IANA name, e.g. America/New_York
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,                 -- SHA-256 of the token; the token itself is never stored
  account_id text NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account_id ON sessions (account_id);

-- One row per check-in. created_at is when it happened on the phone.
CREATE TABLE IF NOT EXISTS check_ins (
  id            text PRIMARY KEY,
  account_id    text NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL,
  mood          smallint NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy        smallint NOT NULL CHECK (energy BETWEEN 1 AND 5),
  focus         smallint NOT NULL CHECK (focus BETWEEN 1 AND 5),
  sleep_quality smallint CHECK (sleep_quality BETWEEN 1 AND 5),
  kind          text CHECK (kind IN ('morning', 'midday', 'evening', 'anytime')),
  note          text,
  local_day     date,                          -- the participant's calendar day when they checked in
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS check_ins_account_time ON check_ins (account_id, created_at);

-- Which phone permissions each participant has granted.
CREATE TABLE IF NOT EXISTS data_sources (
  account_id text NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  source_id  text NOT NULL,                    -- appUsage | notifications | motion
  status     text NOT NULL,                    -- connected | notConnected | unavailable
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, source_id)
);

-- Phone use, uploaded one local day at a time (a re-upload replaces the day).
CREATE TABLE IF NOT EXISTS usage_days (
  account_id            text NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  day                   date NOT NULL,
  longest_focus_minutes integer NOT NULL,
  uploaded_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, day)
);

CREATE TABLE IF NOT EXISTS usage_hours (
  account_id    text NOT NULL,
  day           date NOT NULL,
  hour          smallint NOT NULL CHECK (hour BETWEEN 0 AND 23),
  pickups       integer NOT NULL,
  notifications integer NOT NULL,
  PRIMARY KEY (account_id, day, hour),
  FOREIGN KEY (account_id, day) REFERENCES usage_days (account_id, day) ON DELETE CASCADE
);

-- Time in each app during each hour.
CREATE TABLE IF NOT EXISTS app_usage (
  account_id text NOT NULL,
  day        date NOT NULL,
  hour       smallint NOT NULL,
  position   smallint NOT NULL,                -- order the phone listed the apps in
  app_id     text NOT NULL,                    -- Android package name
  app_name   text NOT NULL,
  category   text NOT NULL,                    -- productivity | communication | social | entertainment | other
  seconds    integer NOT NULL CHECK (seconds BETWEEN 0 AND 3600),
  opens      integer NOT NULL,
  PRIMARY KEY (account_id, day, hour, app_id),
  FOREIGN KEY (account_id, day, hour) REFERENCES usage_hours (account_id, day, hour) ON DELETE CASCADE
);

-- Daily health totals (NULL means the phone had no data, which is not 0).
CREATE TABLE IF NOT EXISTS health_days (
  account_id       text NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  day              date NOT NULL,
  sleep_minutes    integer,
  sleep_start      timestamptz,                -- bedtime of the night's main sleep
  sleep_end        timestamptz,                -- wake time
  steps            integer,
  exercise_minutes integer,
  distance_meters  integer,
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, day)
);

-- The phone each participant uses, reported on every sync. last_seen_at shows
-- who has stopped syncing.
CREATE TABLE IF NOT EXISTS devices (
  account_id    text NOT NULL,
  install_id    text NOT NULL,          -- random per app install
  platform      text NOT NULL,          -- android | ios
  manufacturer  text NULL,
  model         text NULL,
  os_version    text NULL,
  app_version   text NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, install_id),
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
);

-- The wellness score (0-100) the app showed the participant that day, and its
-- three parts. NULL means the app couldn't work that part out.
CREATE TABLE IF NOT EXISTS wellness_days (
  account_id  text NOT NULL,
  day         date NOT NULL,
  score       smallint CHECK (score BETWEEN 0 AND 100),
  body        smallint CHECK (body BETWEEN 0 AND 100),
  mind        smallint CHECK (mind BETWEEN 0 AND 100),
  digital     smallint CHECK (digital BETWEEN 0 AND 100),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, day),
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
);

-- Columns added after the first study build.
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS local_day date;
ALTER TABLE health_days ADD COLUMN IF NOT EXISTS sleep_start timestamptz;
ALTER TABLE health_days ADD COLUMN IF NOT EXISTS sleep_end timestamptz;

-- For analysis: one row per participant per day that has any data. Export it
-- from Beekeeper as CSV. Minutes are rounded; check-in ratings are averages.
CREATE OR REPLACE VIEW daily_summary AS
SELECT
  d.account_id,
  d.day,
  CASE WHEN ud.day IS NULL THEN NULL ELSE COALESCE(au.screen_minutes, 0) END AS screen_minutes,
  CASE WHEN ud.day IS NULL THEN NULL ELSE COALESCE(au.social_minutes, 0) END AS social_minutes,
  CASE WHEN ud.day IS NULL THEN NULL ELSE COALESCE(au.apps_used, 0) END AS apps_used,
  CASE WHEN ud.day IS NULL THEN NULL ELSE COALESCE(uh.pickups, 0) END AS pickups,
  CASE WHEN ud.day IS NULL THEN NULL ELSE COALESCE(uh.notifications, 0) END AS notifications,
  ud.longest_focus_minutes,
  h.sleep_minutes,
  h.sleep_start,
  h.sleep_end,
  h.steps,
  h.exercise_minutes,
  h.distance_meters,
  COALESCE(c.check_ins, 0) AS check_ins,
  c.avg_mood,
  c.avg_energy,
  c.avg_focus,
  c.sleep_quality,
  w.score AS wellness_score,
  w.body AS wellness_body,
  w.mind AS wellness_mind,
  w.digital AS wellness_digital
FROM (
  SELECT account_id, day FROM usage_days
  UNION SELECT account_id, day FROM health_days
  UNION SELECT account_id, COALESCE(local_day, (created_at AT TIME ZONE 'UTC')::date) FROM check_ins
  UNION SELECT account_id, day FROM wellness_days
) d
LEFT JOIN usage_days ud ON ud.account_id = d.account_id AND ud.day = d.day
LEFT JOIN (
  SELECT account_id, day, SUM(pickups) AS pickups, SUM(notifications) AS notifications
  FROM usage_hours GROUP BY account_id, day
) uh ON uh.account_id = d.account_id AND uh.day = d.day
LEFT JOIN (
  SELECT account_id, day,
    ROUND(SUM(seconds) / 60.0) AS screen_minutes,
    ROUND(SUM(CASE WHEN category = 'social' THEN seconds ELSE 0 END) / 60.0) AS social_minutes,
    COUNT(DISTINCT app_id) AS apps_used
  FROM app_usage GROUP BY account_id, day
) au ON au.account_id = d.account_id AND au.day = d.day
LEFT JOIN health_days h ON h.account_id = d.account_id AND h.day = d.day
LEFT JOIN (
  SELECT account_id, COALESCE(local_day, (created_at AT TIME ZONE 'UTC')::date) AS day, COUNT(*) AS check_ins,
    ROUND(AVG(mood), 2) AS avg_mood, ROUND(AVG(energy), 2) AS avg_energy, ROUND(AVG(focus), 2) AS avg_focus,
    MAX(sleep_quality) AS sleep_quality
  FROM check_ins GROUP BY account_id, COALESCE(local_day, (created_at AT TIME ZONE 'UTC')::date)
) c ON c.account_id = d.account_id AND c.day = d.day
LEFT JOIN wellness_days w ON w.account_id = d.account_id AND w.day = d.day;

-- For checking on the study: one row per participant with how much data they
-- have sent and when their phone last synced.
CREATE OR REPLACE VIEW participants AS
SELECT
  a.id AS account_id,
  a.email,
  a.timezone,
  a.created_at AS signed_up_at,
  (SELECT MAX(last_seen_at) FROM devices v WHERE v.account_id = a.id) AS last_sync_at,
  (SELECT concat_ws(' ', v.manufacturer, v.model, v.os_version) FROM devices v
    WHERE v.account_id = a.id ORDER BY v.last_seen_at DESC LIMIT 1) AS device,
  (SELECT v.app_version FROM devices v WHERE v.account_id = a.id ORDER BY v.last_seen_at DESC LIMIT 1) AS app_version,
  (SELECT COUNT(*) FROM check_ins c WHERE c.account_id = a.id) AS check_ins,
  (SELECT COUNT(*) FROM usage_days u WHERE u.account_id = a.id) AS usage_days,
  (SELECT COUNT(*) FROM health_days h WHERE h.account_id = a.id) AS health_days,
  (SELECT MIN(day) FROM daily_summary s WHERE s.account_id = a.id) AS first_day,
  (SELECT MAX(day) FROM daily_summary s WHERE s.account_id = a.id) AS last_day
FROM accounts a;
