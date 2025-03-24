CREATE TABLE IF NOT EXISTS pastes (
  slug TEXT primary key,
  content TEXT NOT NULL,
  secret TEXT NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
