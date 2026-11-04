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
  steps            INT NULL,
  exercise_minutes INT NULL,
  distance_meters  INT NULL,
  uploaded_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (account_id, day),
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
