Drop TABLE IF EXISTS pastes;

CREATE TABLE IF NOT EXISTS pastes (
  slug TEXT primary key,
  content BLOB NOT NULL,
  content_type TEXT NOT NULL,
  secret TEXT NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
