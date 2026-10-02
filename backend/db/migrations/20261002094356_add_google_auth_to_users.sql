-- migrate:up

-- Google sign-in (TaskFlow): Google-only accounts have no password, and the
-- Google account id (ID token `sub`) links a Google login to a user.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;

-- migrate:down

-- Fails while Google-only users (password_hash IS NULL) exist; remove or give
-- them a password first.
ALTER TABLE users DROP COLUMN google_id;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
