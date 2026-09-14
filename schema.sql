-- Portulan schema (Neon Postgres)
-- Applied on first boot when DATABASE_URL is configured.
-- Tables live in the dedicated "portulan" schema to avoid collisions with other apps in public.

CREATE SCHEMA IF NOT EXISTS portulan;

CREATE TABLE IF NOT EXISTS portulan.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE,
  login TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  email TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE portulan.users ALTER COLUMN github_id DROP NOT NULL;
ALTER TABLE portulan.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE portulan.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_login_lower_uidx ON portulan.users (LOWER(login));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON portulan.users (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS portulan.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  theme_paper TEXT NOT NULL DEFAULT 'carta',
  theme_mode TEXT NOT NULL DEFAULT 'light',
  theme_ink TEXT NOT NULL DEFAULT '#1a2847',
  is_personal BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON portulan.workspaces (created_by);

CREATE TABLE IF NOT EXISTS portulan.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON portulan.workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON portulan.workspace_members (user_id);

CREATE TABLE IF NOT EXISTS portulan.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES portulan.workspaces(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_by UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON portulan.workspace_invites (workspace_id);

-- Porto inicial de cada conta: um workspace pessoal com o dono como capitão.
INSERT INTO portulan.workspaces (slug, name, is_personal, created_by)
SELECT
  'porto-' || SUBSTRING(u.id::text FROM 1 FOR 8),
  'Porto de ' || SPLIT_PART(COALESCE(NULLIF(TRIM(u.name), ''), u.login), ' ', 1),
  TRUE,
  u.id
FROM portulan.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM portulan.workspaces AS w WHERE w.created_by = u.id AND w.is_personal
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO portulan.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.created_by, 'owner'
FROM portulan.workspaces AS w
WHERE w.created_by IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

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
ALTER TABLE portulan.templates ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES portulan.workspaces(id) ON DELETE CASCADE;

UPDATE portulan.templates AS t
SET workspace_id = w.id
FROM portulan.workspaces AS w
WHERE t.workspace_id IS NULL
  AND t.user_id IS NOT NULL
  AND w.created_by = t.user_id
  AND w.is_personal;

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON portulan.templates (user_id);
CREATE INDEX IF NOT EXISTS idx_templates_workspace_id ON portulan.templates (workspace_id);

CREATE TABLE IF NOT EXISTS portulan.mcp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Token MCP',
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

ALTER TABLE portulan.mcp_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE portulan.mcp_tokens ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES portulan.workspaces(id) ON DELETE SET NULL;

UPDATE portulan.mcp_tokens AS t
SET workspace_id = w.id
FROM portulan.workspaces AS w
WHERE t.workspace_id IS NULL
  AND w.created_by = t.user_id
  AND w.is_personal;

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
  published_at TIMESTAMPTZ,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE
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
ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES portulan.workspaces(id) ON DELETE SET NULL;
ALTER TABLE portulan.documents ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

UPDATE portulan.documents AS d
SET workspace_id = w.id
FROM portulan.workspaces AS w
WHERE d.workspace_id IS NULL
  AND d.user_id IS NOT NULL
  AND w.created_by = d.user_id
  AND w.is_personal;

UPDATE portulan.documents SET visibility = 'public' WHERE is_public AND visibility <> 'public';
ALTER TABLE portulan.documents DROP CONSTRAINT IF EXISTS documents_visibility_check;
ALTER TABLE portulan.documents ADD CONSTRAINT documents_visibility_check CHECK (visibility IN ('private', 'workspace', 'public'));

CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON portulan.documents (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON portulan.documents (workspace_id);
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
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
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
ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE portulan.document_releases ADD COLUMN IF NOT EXISTS published_by_user_id UUID REFERENCES portulan.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_releases_document ON portulan.document_releases (document_id, version DESC);

CREATE TABLE IF NOT EXISTS portulan.document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  invited_by UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES portulan.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, email)
);

CREATE TABLE IF NOT EXISTS portulan.document_slug_aliases (
  slug TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_slug_aliases_document_id ON portulan.document_slug_aliases (document_id);

CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON portulan.document_shares (document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_user_id ON portulan.document_shares (user_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_email ON portulan.document_shares (email);

CREATE TABLE IF NOT EXISTS portulan.document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL REFERENCES portulan.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES portulan.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  section_anchor TEXT,
  quoted_text TEXT,
  parent_id UUID REFERENCES portulan.document_comments(id) ON DELETE CASCADE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON portulan.document_comments (document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_user_id ON portulan.document_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_created_at ON portulan.document_comments (created_at);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent_id ON portulan.document_comments (parent_id);
