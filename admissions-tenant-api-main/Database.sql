-- ============================================================
-- Admission SaaS — Database Schema (Idempotent)
-- ============================================================
-- SAFE TO RUN REPEATEDLY: Uses IF NOT EXISTS / IF NOT EXISTS
-- patterns so no data is lost and no duplicates are created.
--
-- HOW TO USE:
--   1. Open pgAdmin → Select your "admission_db" database
--   2. Open Query Tool
--   3. Paste this entire file
--   4. Click Execute (F5)
--
-- This file is the SINGLE SOURCE OF TRUTH for the DB schema.
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- ENUM TYPES (create only if they don't exist)
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_status_enum') THEN
        CREATE TYPE org_status_enum AS ENUM ('active', 'suspended', 'expired');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM (
            'superadmin',
            'org_admin',
            'lead_manager',
            'counselor',
            'application_manager',
            'exam_manager'
        );
    END IF;
END
$$;


-- ============================================================
-- TABLE: organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255)        NOT NULL,
    slug            VARCHAR(255)        NOT NULL UNIQUE,
    email           VARCHAR(255)        NOT NULL,
    phone           VARCHAR(50),
    address         TEXT,
    logo_url        VARCHAR(500),
    status          org_status_enum     NOT NULL DEFAULT 'active',
    subscription_start  TIMESTAMP       NOT NULL,
    subscription_end    TIMESTAMP       NOT NULL,
    
    -- Audit Tracking
    created_by      UUID,
    updated_by      UUID,
    
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP           NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: branches
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255)        NOT NULL,
    code            VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    organization_id UUID                NOT NULL,
    
    -- Audit Tracking
    created_by      UUID,
    updated_by      UUID,
    
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_branches_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE
);


-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255)        NOT NULL,
    email           VARCHAR(255)        NOT NULL UNIQUE,
    password        VARCHAR(255)        NOT NULL,
    role            user_role_enum      NOT NULL DEFAULT 'counselor',
    phone           VARCHAR(50),
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    organization_id UUID,
    branch_id       UUID,
    
    -- Security & Audit
    token_version   INT                 NOT NULL DEFAULT 0,
    created_by      UUID,
    updated_by      UUID,
    
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_users_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_users_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id)
        ON DELETE SET NULL
);


-- ============================================================
-- INDEXES (create only if they don't exist)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_branches_org_id     ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id        ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id     ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role          ON users(role);
CREATE INDEX IF NOT EXISTS idx_organizations_slug  ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);


-- ============================================================
-- BACKWARD COMPATIBILITY (Add columns to existing tables)
-- ============================================================
-- These run safely even if columns were already created above.

-- Organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by UUID;


-- ============================================================
-- TABLE: form_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS form_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255)        NOT NULL,
    fields          JSONB               NOT NULL DEFAULT '[]',
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: forms
-- ============================================================
CREATE TABLE IF NOT EXISTS forms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID                NOT NULL,
    name            VARCHAR(255)        NOT NULL,
    status          VARCHAR(20)         NOT NULL DEFAULT 'draft', -- draft | active | expired
    campaign_id     UUID,
    slug            VARCHAR(255)        NOT NULL DEFAULT '',
    fields          JSONB               NOT NULL DEFAULT '[]',

    created_by      UUID,
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_forms_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_form_slug_per_org UNIQUE (organization_id, slug)
);


-- ============================================================
-- TABLE: form_fields
-- ============================================================
CREATE TABLE IF NOT EXISTS form_fields (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id         UUID                NOT NULL,
    label           VARCHAR(255)        NOT NULL,
    type            VARCHAR(50)         NOT NULL, -- text, email, phone, select, etc.
    is_required     BOOLEAN             NOT NULL DEFAULT FALSE,
    options         JSONB               NOT NULL DEFAULT '[]',
    "order"         INTEGER             NOT NULL DEFAULT 0,

    CONSTRAINT fk_form_fields_form
        FOREIGN KEY (form_id)
        REFERENCES forms(id)
        ON DELETE CASCADE
);


-- ============================================================
-- TABLE: form_submissions (Raw Layer)
-- ============================================================
CREATE TABLE IF NOT EXISTS form_submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id         UUID                NOT NULL,
    organization_id UUID                NOT NULL,
    data            JSONB               NOT NULL DEFAULT '{}', -- fieldId → value
    utm_data        JSONB               NOT NULL DEFAULT '{}',
    source          VARCHAR(100),
    ip_address      VARCHAR(45),
    user_agent      TEXT,

    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_submissions_form
        FOREIGN KEY (form_id)
        REFERENCES forms(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_submissions_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE
);


-- ============================================================
-- TABLE: leads (Main Table)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID                NOT NULL,
    branch_id       UUID,

    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    email           VARCHAR(255),
    phone           VARCHAR(50),

    country         VARCHAR(100),
    state           VARCHAR(100),
    city            VARCHAR(100),

    source          VARCHAR(100),
    source_detail   TEXT,

    utm_source      VARCHAR(100),
    utm_medium      VARCHAR(100),
    utm_campaign    VARCHAR(100),

    form_id         UUID,
    campaign_id     UUID,

    is_duplicate    BOOLEAN             NOT NULL DEFAULT FALSE,
    duplicate_count INTEGER             NOT NULL DEFAULT 0,

    raw_payload     JSONB               NOT NULL DEFAULT '{}',

    assigned_to     UUID,
    assigned_at     TIMESTAMP,

    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_leads_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_leads_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id)
        ON DELETE SET NULL
);


-- ============================================================
-- TABLE: form_stats & analytics
-- ============================================================
CREATE TABLE IF NOT EXISTS form_stats (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id         UUID                NOT NULL UNIQUE,
    total_submissions   INTEGER         NOT NULL DEFAULT 0,
    unique_submissions  INTEGER         NOT NULL DEFAULT 0,
    duplicate_attempts  INTEGER         NOT NULL DEFAULT 0,
    last_submission_at  TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_stats_form
        FOREIGN KEY (form_id)
        REFERENCES forms(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS form_daily_stats (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id         UUID                NOT NULL,
    date            DATE                NOT NULL,
    total_submissions   INTEGER         NOT NULL DEFAULT 0,
    unique_submissions  INTEGER         NOT NULL DEFAULT 0,
    
    PRIMARY KEY (id),
    UNIQUE (form_id, date),

    CONSTRAINT fk_daily_stats_form
        FOREIGN KEY (form_id)
        REFERENCES forms(id)
        ON DELETE CASCADE
);


-- ============================================================
-- TABLE: form_responses
-- ============================================================
CREATE TABLE IF NOT EXISTS form_responses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id         UUID                NOT NULL,
    organization_id UUID                NOT NULL,
    data            JSONB               NOT NULL DEFAULT '{}',
    status          VARCHAR(20)         NOT NULL DEFAULT 'pending', -- verified | pending | rejected
    is_duplicate    BOOLEAN             NOT NULL DEFAULT FALSE,
    submitted_at    TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_responses_form
        FOREIGN KEY (form_id)
        REFERENCES forms(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_responses_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE
);


-- ============================================================
-- INDEXES (create only if they don't exist)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_forms_org_id        ON forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug          ON forms(slug);
CREATE INDEX IF NOT EXISTS idx_responses_form_id   ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_org_id    ON form_responses(organization_id);
CREATE INDEX IF NOT EXISTS idx_responses_data_email ON form_responses((data->>'email'));
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_id        ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_email         ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone         ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_templates_active    ON form_templates(is_active);

-- ============================================================
-- BACKWARD COMPATIBILITY & IDEMPOTENT UPDATES (FOR EXISTING)
-- ============================================================
ALTER TABLE forms ADD COLUMN IF NOT EXISTS slug VARCHAR(255) DEFAULT '';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_form_slug_per_org') THEN
        ALTER TABLE forms ADD CONSTRAINT unique_form_slug_per_org UNIQUE (organization_id, slug);
    END IF;
END $$;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
