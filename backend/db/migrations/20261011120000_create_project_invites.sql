-- migrate:up

-- Email invites (TaskFlow): an owner or admin invites an email address to a
-- project; the link in the email carries a random token whose SHA-256 is
-- stored here, so the table alone can never be turned into working links.
CREATE TABLE project_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role member_role NOT NULL DEFAULT 'member' CHECK (role <> 'owner'),
    token_hash TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- At most one open invite per email per project. The service checks this
-- first for a friendly error; the index closes the race between two requests.
CREATE UNIQUE INDEX project_invites_one_open
    ON project_invites (project_id, email)
    WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- migrate:down

DROP TABLE project_invites;
