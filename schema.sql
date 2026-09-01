-- Portulan schema (Neon Postgres)
-- Applied on first boot when DATABASE_URL is configured.
-- Tables live in the dedicated "portulan" schema to avoid collisions with other apps in public.

CREATE SCHEMA IF NOT EXISTS portulan;

CREATE TABLE IF NOT EXISTS portulan.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT NOT NULL UNIQUE,
  login TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portulan.documents (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('feature', 'incident', 'report', 'reference')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'published', 'archived')),
  author TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  user_id UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON portulan.documents (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_type ON portulan.documents (type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON portulan.documents (status);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON portulan.documents (user_id);

CREATE TABLE IF NOT EXISTS portulan.document_releases (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('feature', 'incident', 'report', 'reference')),
  author TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL,
  UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_document_releases_document ON portulan.document_releases (document_id, version DESC);
