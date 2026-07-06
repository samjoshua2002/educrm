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
    status          VARCHAR(50)         NOT NULL DEFAULT 'unverified',
    verified_by     UUID,
    verified_at     TIMESTAMP,
    score           INTEGER,
    score_band      VARCHAR(20),
    next_follow_up_at TIMESTAMP,
    closure_reason  VARCHAR(100),
    closure_notes   TEXT,

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
-- TABLE: lead_activities (Timeline / Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_activities (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id             UUID                NOT NULL,
    organization_id     UUID                NOT NULL,
    actor_id            UUID,
    action              VARCHAR(50)         NOT NULL,
    content             TEXT,
    disposition         VARCHAR(100),
    previous_status     VARCHAR(50),
    new_status          VARCHAR(50),
    previous_assigned_to UUID,
    new_assigned_to     UUID,
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_activities_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_activities_org
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS idx_leads_status        ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to   ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id  ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_org_id   ON lead_activities(organization_id);
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

ALTER TABLE leads ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'unverified';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_band VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS closure_reason VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS closure_notes TEXT;

-- ============================================================
-- TABLE: students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_students_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_student_email_per_org UNIQUE (organization_id, email)
);

-- ============================================================
-- TABLE: academic_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS academic_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID                NOT NULL,
    name                VARCHAR(50)         NOT NULL,   -- e.g., '2025-26'
    display_name        VARCHAR(100),                   -- e.g., 'Academic Year 2025-26'
    start_date          DATE,
    end_date            DATE,
    is_current          BOOLEAN             NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN             NOT NULL DEFAULT TRUE,

    -- Audit
    created_by          UUID,
    updated_by          UUID,
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_academic_sessions_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_session_name_per_org
        UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_academic_sessions_org_id
    ON academic_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_current
    ON academic_sessions(organization_id, is_current)
    WHERE is_current = TRUE;

-- ============================================================
-- TABLE: courses
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID                NOT NULL,
    name                VARCHAR(255)        NOT NULL,   -- e.g., 'PGDM', 'MBA', 'B.Tech CSE'
    code                VARCHAR(50),                    -- e.g., 'PGDM-01', 'MBA-FIN'
    description         TEXT,
    department          VARCHAR(255),                   -- e.g., 'Management', 'Engineering'
    duration            VARCHAR(50),                    -- e.g., '2 Years', '4 Years'
    duration_months     INTEGER,                        -- numeric: 24, 48 (for computation)
    total_fee           DECIMAL(12, 2),                 -- default fee template
    total_seats         INTEGER,                        -- total seat capacity (optional)
    is_active           BOOLEAN             NOT NULL DEFAULT TRUE,

    -- Audit
    created_by          UUID,
    updated_by          UUID,
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_courses_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_course_code_per_org
        UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_courses_org_id
    ON courses(organization_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_active
    ON courses(organization_id, is_active)
    WHERE is_active = TRUE;

-- ============================================================
-- TABLE: course_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS course_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID                NOT NULL,
    course_id           UUID                NOT NULL,
    academic_session_id UUID                NOT NULL,
    total_seats         INTEGER,                        -- session-specific seat override
    fee_amount          DECIMAL(12, 2),                 -- session-specific fee override
    is_active           BOOLEAN             NOT NULL DEFAULT TRUE,

    -- Audit
    created_by          UUID,
    updated_by          UUID,
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_sessions_org
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_course_sessions_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_course_sessions_session
        FOREIGN KEY (academic_session_id)
        REFERENCES academic_sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_course_session
        UNIQUE (organization_id, course_id, academic_session_id)
);

CREATE INDEX IF NOT EXISTS idx_course_sessions_org_id
    ON course_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_course_id
    ON course_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_session_id
    ON course_sessions(academic_session_id);

-- ============================================================
-- ENUMS FOR APPLICATIONS
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_form_status_enum') THEN
        CREATE TYPE application_form_status_enum AS ENUM (
            'incomplete',
            'submitted',
            'under_review',
            'accepted',
            'rejected'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_payment_status_enum') THEN
        CREATE TYPE application_payment_status_enum AS ENUM (
            'pending',
            'paid',
            'failed',
            'refunded'
        );
    END IF;
END
$$;

-- ============================================================
-- TABLE: applications
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id         UUID                NOT NULL,
    branch_id               UUID,
    lead_id                 UUID,                -- optional link back to leads table
    assigned_counselor_id   UUID,                -- counselor who created this application (for audit trail)

    -- Auto-generated application number (e.g. CHN/2026/0001)
    application_no          VARCHAR(50)         NOT NULL UNIQUE,
    academic_session        VARCHAR(20)         NOT NULL,  -- e.g. '2025-26' (renamed from academic_year, now NOT NULL)
    course_id               UUID,                -- FK to courses table, used for duplicate prevention
    program                 VARCHAR(255),        -- display label e.g. 'PGDM', 'MBA'

    -- Photo
    photo_url               VARCHAR(500),

    -- Form & Payment status
    form_status             application_form_status_enum NOT NULL DEFAULT 'incomplete',
    payment_status          application_payment_status_enum NOT NULL DEFAULT 'pending',
    payment_mode            VARCHAR(50),        -- 'Online', 'UPI', 'Net Banking', 'Credit Card', etc.
    payment_amount          DECIMAL(10, 2)      DEFAULT 0,
    payment_date            TIMESTAMP,
    payment_reference       VARCHAR(100),       -- transaction ID

    -- Campus/Location Preferences (FK to branches table — Rule 3)
    preference_1            UUID,               -- FK to branches.id (e.g. Chennai campus)
    preference_2            UUID,               -- FK to branches.id (e.g. Kochi campus)

    -- Personal Details (PDF Page 1)
    name                    VARCHAR(255)        NOT NULL,
    email                   VARCHAR(255)        NOT NULL,
    primary_mobile          VARCHAR(50)         NOT NULL,
    alternate_mobile        VARCHAR(50),
    gender                  VARCHAR(20),        -- 'Male', 'Female', 'Other'
    date_of_birth           DATE,
    age_as_on_reference     VARCHAR(50),        -- 'X Years, Y Days' (computed / stored)
    religion                VARCHAR(50),
    nationality             VARCHAR(50)         DEFAULT 'Indian',
    aadhaar_number          VARCHAR(20),
    category                VARCHAR(20),        -- 'GEN', 'OBC', 'SC', 'ST', 'EWS'
    marital_status          VARCHAR(20),        -- 'Unmarried', 'Married', 'Divorced', 'Widowed'
    spouse_name             VARCHAR(255),
    spouse_occupation       VARCHAR(255),

    -- Additional Info (PDF Page 3)
    inspiration_essay       TEXT,               -- "What inspires you to pursue PGDM/MBA..."
    how_did_you_know        VARCHAR(255),       -- 'Education Portals', 'Social Media', etc.
    has_medical_condition   BOOLEAN             DEFAULT FALSE,
    medical_condition_details TEXT,

    -- Declaration (PDF Page 4)
    declaration_accepted    BOOLEAN             DEFAULT FALSE,
    declaration_applicant_name VARCHAR(255),
    declaration_parent_name VARCHAR(255),
    declaration_date        DATE,
    declaration_place       VARCHAR(100),

    -- Metadata
    submitted_at            TIMESTAMP,
    last_activity_at        TIMESTAMP           DEFAULT NOW(),

    -- Audit
    created_by              UUID,
    updated_by              UUID,
    created_at              TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_applications_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_applications_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_applications_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_applications_counselor
        FOREIGN KEY (assigned_counselor_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_applications_preference_1
        FOREIGN KEY (preference_1)
        REFERENCES branches(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_applications_preference_2
        FOREIGN KEY (preference_2)
        REFERENCES branches(id)
        ON DELETE SET NULL
);

-- ============================================================
-- TABLE: application_education
-- ============================================================
CREATE TABLE IF NOT EXISTS application_education (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id          UUID                NOT NULL,
    level                   VARCHAR(50)         NOT NULL, -- 'Class X', 'Class XII', 'Degree', 'Post Graduation'
    institution             VARCHAR(255),
    board_university        VARCHAR(255),
    year_of_passing         VARCHAR(4),
    percentage_cgpa         VARCHAR(20),
    class_obtained          VARCHAR(50),
    major_subjects          VARCHAR(255),
    is_completed            BOOLEAN             DEFAULT TRUE, -- for 'Degree awaited'

    created_at              TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_education_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE
);

-- ============================================================
-- TABLE: application_entrance_tests
-- ============================================================
CREATE TABLE IF NOT EXISTS application_entrance_tests (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id          UUID                NOT NULL,
    test_name               VARCHAR(100)        NOT NULL, -- 'XAT', 'CAT', 'MAT', etc.
    month_year              VARCHAR(50),
    composite_score         DECIMAL(10, 2),
    percentile              DECIMAL(5, 2),
    
    created_at              TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_entrance_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE
);

-- ============================================================
-- TABLE: application_work_experience
-- ============================================================
CREATE TABLE IF NOT EXISTS application_work_experience (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id          UUID                NOT NULL,
    organization            VARCHAR(255)        NOT NULL,
    designation             VARCHAR(255),
    from_date               DATE,
    to_date                 DATE,
    roles_responsibilities  TEXT,
    gross_salary            VARCHAR(100),
    
    created_at              TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_work_exp_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE
);

-- ============================================================
-- TABLE: application_parents
-- ============================================================
CREATE TABLE IF NOT EXISTS application_parents (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id          UUID                NOT NULL,
    relationship            VARCHAR(50)         NOT NULL, -- 'Father', 'Mother', 'Guardian'
    name                    VARCHAR(255)        NOT NULL,
    age                     INTEGER,
    education               VARCHAR(100),
    occupation              VARCHAR(100),
    organization            VARCHAR(255),
    designation             VARCHAR(100),
    office_address          TEXT,
    phone                   VARCHAR(50),
    email                   VARCHAR(255),
    annual_income           VARCHAR(100),
    
    created_at              TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_parents_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE
);

-- ============================================================
-- TABLE: application_addresses
-- ============================================================
CREATE TABLE IF NOT EXISTS application_addresses (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id          UUID                NOT NULL,
    type                    VARCHAR(50)         NOT NULL, -- 'Present', 'Permanent'
    address_line_1          TEXT                NOT NULL,
    address_line_2          TEXT,
    city                    VARCHAR(100),
    district                VARCHAR(100),
    state                   VARCHAR(100),
    pincode                 VARCHAR(20),
    phone                   VARCHAR(50),
    
    created_at              TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_addresses_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE
);

-- ============================================================
-- TABLE: application_extra_curriculars
-- ============================================================
CREATE TABLE IF NOT EXISTS application_extra_curriculars (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id          UUID                NOT NULL,
    activity                VARCHAR(255)        NOT NULL,
    level                   VARCHAR(100),       -- 'School', 'College', 'State', 'National'
    achievements            TEXT,
    
    created_at              TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_extra_curr_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE
);

-- ============================================================
-- TABLE: application_other_qualifications
-- ============================================================
CREATE TABLE IF NOT EXISTS application_other_qualifications (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id          UUID                NOT NULL,
    course_name             VARCHAR(255)        NOT NULL,
    institution             VARCHAR(255),
    year_of_passing         VARCHAR(4),
    grade_or_percentage     VARCHAR(50),
    
    created_at              TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_other_qual_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE
);

-- ============================================================
-- TABLE: application_activities (Timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS application_activities (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id          UUID                NOT NULL,
    organization_id         UUID                NOT NULL,
    actor_id                UUID,               -- User who performed the action
    action                  VARCHAR(50)         NOT NULL, -- 'created', 'status_changed', 'section_updated', 'note_added'
    content                 TEXT,
    previous_status         VARCHAR(50),
    new_status              VARCHAR(50),
    
    created_at              TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_activities_application
        FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_activities_app_org
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE
);

-- ============================================================
-- INDEXES
-- ============================================================
-- applications
CREATE INDEX IF NOT EXISTS idx_applications_org_id          ON applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_applications_branch_id       ON applications(branch_id);
CREATE INDEX IF NOT EXISTS idx_applications_lead_id         ON applications(lead_id);
CREATE INDEX IF NOT EXISTS idx_applications_application_no  ON applications(application_no);
CREATE INDEX IF NOT EXISTS idx_applications_email           ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_phone           ON applications(primary_mobile);
CREATE INDEX IF NOT EXISTS idx_applications_form_status     ON applications(form_status);
CREATE INDEX IF NOT EXISTS idx_applications_payment_status  ON applications(payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at    ON applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_applications_counselor_id    ON applications(assigned_counselor_id);
CREATE INDEX IF NOT EXISTS idx_applications_course_id       ON applications(course_id);
CREATE INDEX IF NOT EXISTS idx_applications_academic_session ON applications(academic_session);

-- Academic Session Isolation: prevent duplicate active applications per email/course/session (Rule 4)
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique_active
    ON applications (organization_id, email, course_id, academic_session)
    WHERE form_status NOT IN ('rejected');

-- child tables
CREATE INDEX IF NOT EXISTS idx_app_education_app_id         ON application_education(application_id);
CREATE INDEX IF NOT EXISTS idx_app_entrance_app_id          ON application_entrance_tests(application_id);
CREATE INDEX IF NOT EXISTS idx_app_work_exp_app_id          ON application_work_experience(application_id);
CREATE INDEX IF NOT EXISTS idx_app_parents_app_id           ON application_parents(application_id);
CREATE INDEX IF NOT EXISTS idx_app_addresses_app_id         ON application_addresses(application_id);
CREATE INDEX IF NOT EXISTS idx_app_extra_curr_app_id        ON application_extra_curriculars(application_id);
CREATE INDEX IF NOT EXISTS idx_app_other_qual_app_id        ON application_other_qualifications(application_id);
CREATE INDEX IF NOT EXISTS idx_app_activities_app_id        ON application_activities(application_id);
CREATE INDEX IF NOT EXISTS idx_app_activities_org_id        ON application_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_org_id              ON students(organization_id);

-- ============================================================
-- MASTER TABLES MIGRATION & FK CONSTRAINTS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_session_name_per_org') THEN
        ALTER TABLE academic_sessions ADD CONSTRAINT unique_session_name_per_org UNIQUE (organization_id, name);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_course_code_per_org') THEN
        ALTER TABLE courses ADD CONSTRAINT unique_course_code_per_org UNIQUE (organization_id, code);
    END IF;
END $$;

-- 1. Extract unique sessions from existing applications and create master records
INSERT INTO academic_sessions (organization_id, name, is_current, is_active, created_at)
SELECT DISTINCT
    a.organization_id,
    a.academic_session,
    FALSE,
    TRUE,
    NOW()
FROM applications a
WHERE a.academic_session IS NOT NULL
ON CONFLICT (organization_id, name) DO NOTHING;

-- 2. Extract unique programs from existing applications and create course records
INSERT INTO courses (organization_id, name, code, is_active, created_at)
SELECT DISTINCT
    a.organization_id,
    a.program,
    UPPER(REPLACE(a.program, ' ', '-')),  -- auto-generate code from program name
    TRUE,
    NOW()
FROM applications a
WHERE a.program IS NOT NULL AND a.program != ''
ON CONFLICT (organization_id, code) DO NOTHING;

-- 3. Backfill course_id on existing applications
UPDATE applications a
SET course_id = c.id
FROM courses c
WHERE a.organization_id = c.organization_id
  AND a.program = c.name
  AND (a.course_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM courses c2 WHERE c2.id = a.course_id
  ));

-- 4. Add FK constraint on applications.course_id (after courses table exists and data is migrated)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_applications_course') THEN
        ALTER TABLE applications
            ADD CONSTRAINT fk_applications_course
            FOREIGN KEY (course_id)
            REFERENCES courses(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Add course_id column and FK to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS course_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leads_course') THEN
        ALTER TABLE leads
            ADD CONSTRAINT fk_leads_course
            FOREIGN KEY (course_id)
            REFERENCES courses(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_course_id ON leads(course_id);


-- ============================================================
-- END OF SCHEMA
-- ============================================================

