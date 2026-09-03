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

CREATE TABLE IF NOT EXISTS portulan.templates (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES portulan.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  logo_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE portulan.templates ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON portulan.templates (user_id);

CREATE TABLE IF NOT EXISTS portulan.mcp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Token MCP',
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user_id ON portulan.mcp_tokens (user_id);

CREATE TABLE IF NOT EXISTS portulan.documents (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  template_id TEXT NOT NULL REFERENCES portulan.templates(id),
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

-- Migrations for databases created before template-based documents (must run before template_id indexes)
INSERT INTO portulan.templates (id, user_id, name, primary_color, secondary_color, content, is_builtin)
VALUES (
  'portulan-default',
  NULL,
  'Default',
  '#1a2847',
  '#8b2735',
  E'## Visão geral\n\nDescreva o contexto, objetivo e público deste documento.\n\n## Conteúdo principal\n\nDesenvolva o assunto com clareza e evidências.\n\n:::callout{title="Destaque"}\nInformação relevante para o leitor.\n:::\n\n## Próximos passos\n\n- Ação ou decisão pendente\n- Responsável e prazo',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS template_id TEXT;
UPDATE portulan.documents SET template_id = 'portulan-default' WHERE template_id IS NULL;
DROP INDEX IF EXISTS portulan.idx_documents_type;
ALTER TABLE portulan.documents DROP COLUMN IF EXISTS type;

CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON portulan.documents (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON portulan.documents (template_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON portulan.documents (status);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON portulan.documents (user_id);

CREATE TABLE IF NOT EXISTS portulan.document_releases (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  template_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  logo_url TEXT,
  author TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL,
  UNIQUE (document_id, version)
);

ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS secondary_color TEXT;

UPDATE portulan.document_releases AS r
SET
  template_id = COALESCE(r.template_id, 'portulan-default'),
  template_name = COALESCE(r.template_name, 'Default'),
  primary_color = COALESCE(r.primary_color, '#1a2847'),
  secondary_color = COALESCE(r.secondary_color, '#8b2735')
WHERE r.template_id IS NULL OR r.template_name IS NULL OR r.primary_color IS NULL OR r.secondary_color IS NULL;

ALTER TABLE portulan.document_releases DROP COLUMN IF EXISTS type;

CREATE INDEX IF NOT EXISTS idx_document_releases_document ON portulan.document_releases (document_id, version DESC);
