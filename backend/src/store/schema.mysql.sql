-- SmartFocus tables (MySQL 8). The API creates any that are missing when it
-- starts, so running this by hand is optional. Safe to run more than once.
-- Same tables as schema.sql (PostgreSQL). Dates are the participant's local
-- calendar day; timestamps are UTC.

CREATE TABLE IF NOT EXISTS accounts (
  id            VARCHAR(32) PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,  -- stored lowercased
  password_hash VARCHAR(255) NOT NULL,
  timezone      VARCHAR(64) NOT NULL,          -- IANA name, e.g. America/New_York
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,             -- SHA-256 of the token; the token itself is never stored
  account_id VARCHAR(32) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per check-in. created_at is when it happened on the phone.
CREATE TABLE IF NOT EXISTS check_ins (
  id            VARCHAR(32) PRIMARY KEY,
  account_id    VARCHAR(32) NOT NULL,
  created_at    DATETIME(3) NOT NULL,
  mood          TINYINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy        TINYINT NOT NULL CHECK (energy BETWEEN 1 AND 5),
  focus         TINYINT NOT NULL CHECK (focus BETWEEN 1 AND 5),
  sleep_quality TINYINT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  kind          VARCHAR(16) NULL CHECK (kind IN ('morning', 'midday', 'evening', 'anytime')),
  note          TEXT NULL,
  local_day     DATE NULL,                     -- the participant's calendar day when they checked in
  uploaded_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY check_ins_account_time (account_id, created_at),
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Which phone permissions each participant has granted.
CREATE TABLE IF NOT EXISTS data_sources (
  account_id VARCHAR(32) NOT NULL,
  source_id  VARCHAR(32) NOT NULL,             -- appUsage | notifications | motion
  status     VARCHAR(16) NOT NULL,             -- connected | notConnected | unavailable
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (account_id, source_id),
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Phone use, uploaded one local day at a time (a re-upload replaces the day).
CREATE TABLE IF NOT EXISTS usage_days (
  account_id            VARCHAR(32) NOT NULL,
  day                   DATE NOT NULL,
  longest_focus_minutes INT NOT NULL,
  uploaded_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (account_id, day),
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usage_hours (
  account_id    VARCHAR(32) NOT NULL,
  day           DATE NOT NULL,
  hour          TINYINT NOT NULL CHECK (hour BETWEEN 0 AND 23),
  pickups       INT NOT NULL,
  notifications INT NOT NULL,
  PRIMARY KEY (account_id, day, hour),
  FOREIGN KEY (account_id, day) REFERENCES usage_days (account_id, day) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Time in each app during each hour.
CREATE TABLE IF NOT EXISTS app_usage (
  account_id VARCHAR(32) NOT NULL,
  day        DATE NOT NULL,
  hour       TINYINT NOT NULL,
  position   SMALLINT NOT NULL,                -- order the phone listed the apps in
  app_id     VARCHAR(255) NOT NULL,            -- Android package name
  app_name   VARCHAR(255) NOT NULL,
  category   VARCHAR(16) NOT NULL,             -- productivity | communication | social | entertainment | other
  seconds    INT NOT NULL CHECK (seconds BETWEEN 0 AND 3600),
  opens      INT NOT NULL,
  PRIMARY KEY (account_id, day, hour, app_id),
  FOREIGN KEY (account_id, day, hour) REFERENCES usage_hours (account_id, day, hour) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Daily health totals (NULL means the phone had no data, which is not 0).
CREATE TABLE IF NOT EXISTS health_days (
  account_id       VARCHAR(32) NOT NULL,
  day              DATE NOT NULL,
  sleep_minutes    INT NULL,
  sleep_start      DATETIME(3) NULL,           -- bedtime of the night's main sleep (UTC)
  sleep_end        DATETIME(3) NULL,           -- wake time (UTC)
  steps            INT NULL,
  exercise_minutes INT NULL,
  distance_meters  INT NULL,
  uploaded_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (account_id, day),
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The phone each participant uses, reported on every sync. last_seen_at shows
-- who has stopped syncing.
CREATE TABLE IF NOT EXISTS devices (
  account_id    VARCHAR(32) NOT NULL,
  install_id    VARCHAR(64) NOT NULL,          -- random per app install
  platform      VARCHAR(16) NOT NULL,          -- android | ios
  manufacturer  VARCHAR(64) NULL,
  model         VARCHAR(64) NULL,
  os_version    VARCHAR(32) NULL,
  app_version   VARCHAR(32) NULL,
  first_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (account_id, install_id),
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The wellness score (0-100) the app showed the participant that day, and its
-- three parts. NULL means the app couldn't work that part out.
CREATE TABLE IF NOT EXISTS wellness_days (
  account_id  VARCHAR(32) NOT NULL,
  day         DATE NOT NULL,
  score       TINYINT NULL CHECK (score BETWEEN 0 AND 100),
  body        TINYINT NULL CHECK (body BETWEEN 0 AND 100),
  mind        TINYINT NULL CHECK (mind BETWEEN 0 AND 100),
  digital     TINYINT NULL CHECK (digital BETWEEN 0 AND 100),
  uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (account_id, day),
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Columns added after the first study build. "Duplicate column" errors are
-- ignored, so these are safe to run on every start.
ALTER TABLE check_ins ADD COLUMN local_day DATE NULL AFTER note;
ALTER TABLE health_days ADD COLUMN sleep_start DATETIME(3) NULL AFTER sleep_minutes;
ALTER TABLE health_days ADD COLUMN sleep_end DATETIME(3) NULL AFTER sleep_start;

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
  UNION SELECT account_id, COALESCE(local_day, DATE(created_at)) FROM check_ins
  UNION SELECT account_id, day FROM wellness_days
) d
LEFT JOIN usage_days ud ON ud.account_id = d.account_id AND ud.day = d.day
LEFT JOIN (
  SELECT account_id, day, SUM(pickups) AS pickups, SUM(notifications) AS notifications
  FROM usage_hours GROUP BY account_id, day
) uh ON uh.account_id = d.account_id AND uh.day = d.day
LEFT JOIN (
  SELECT account_id, day,
    ROUND(SUM(seconds) / 60) AS screen_minutes,
    ROUND(SUM(CASE WHEN category = 'social' THEN seconds ELSE 0 END) / 60) AS social_minutes,
    COUNT(DISTINCT app_id) AS apps_used
  FROM app_usage GROUP BY account_id, day
) au ON au.account_id = d.account_id AND au.day = d.day
LEFT JOIN health_days h ON h.account_id = d.account_id AND h.day = d.day
LEFT JOIN (
  SELECT account_id, COALESCE(local_day, DATE(created_at)) AS day, COUNT(*) AS check_ins,
    ROUND(AVG(mood), 2) AS avg_mood, ROUND(AVG(energy), 2) AS avg_energy, ROUND(AVG(focus), 2) AS avg_focus,
    MAX(sleep_quality) AS sleep_quality
  FROM check_ins GROUP BY account_id, COALESCE(local_day, DATE(created_at))
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
  (SELECT CONCAT_WS(' ', v.manufacturer, v.model, v.os_version) FROM devices v
    WHERE v.account_id = a.id ORDER BY v.last_seen_at DESC LIMIT 1) AS device,
  (SELECT v.app_version FROM devices v WHERE v.account_id = a.id ORDER BY v.last_seen_at DESC LIMIT 1) AS app_version,
  (SELECT COUNT(*) FROM check_ins c WHERE c.account_id = a.id) AS check_ins,
  (SELECT COUNT(*) FROM usage_days u WHERE u.account_id = a.id) AS usage_days,
  (SELECT COUNT(*) FROM health_days h WHERE h.account_id = a.id) AS health_days,
  (SELECT MIN(day) FROM daily_summary s WHERE s.account_id = a.id) AS first_day,
  (SELECT MAX(day) FROM daily_summary s WHERE s.account_id = a.id) AS last_day
FROM accounts a
