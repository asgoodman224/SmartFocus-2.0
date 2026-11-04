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
  steps            integer,
  exercise_minutes integer,
  distance_meters  integer,
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, day)
);
