# Master Tables Implementation Plan — Courses & Academic Sessions

## Background & Problem Statement

The `applications` table already contains a `course_id UUID` column (nullable, no FK constraint) and a `program VARCHAR(255)` column intended as a display label. A unique index `idx_applications_unique_active` enforces duplicate prevention on `(organization_id, email, course_id, academic_session)` for non-rejected applications. The `academic_session` column is a free-text `VARCHAR(20)`.

**Currently, neither `courses` nor `academic_sessions` master tables exist.** Both were designed as "Future Enhancement" placeholders (visible in commented-out SQL in the original schema blueprint). This means:

- `course_id` on applications is an orphan UUID with no referential integrity
- `program` is free-text with no validation against a master list
- `academic_session` is free-text (e.g., `"2025-26"`) with no governance
- Reporting by course/program is unreliable (typos, inconsistencies)
- No seat management, fee template, or course-branch mapping is possible

---

## Scope

This plan covers **backend only** — new NestJS modules, database tables, API endpoints, and modifications to existing services.

> [!IMPORTANT]
> No frontend changes are in scope. The APIs are designed to be consumed by any frontend later.

---

## Proposed Changes

### Phase 1 — New Master Tables & Modules

---

#### 1.1 Database Schema — `academic_sessions` Table

```sql
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
```

**Design Decisions:**
| Field | Rationale |
|---|---|
| `name` | Short canonical key (`"2025-26"`) — matches existing free-text values in `applications.academic_session` |
| `display_name` | Optional human-friendly label for UI |
| `start_date` / `end_date` | Optional but enables date-range validations (e.g., session expired) |
| `is_current` | Quick lookup for the org's active session; enforced at app level (only 1 per org) |
| `is_active` | Soft-delete / archive mechanism |

---

#### 1.2 Database Schema — `courses` Table

```sql
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
```

**Design Decisions:**
| Field | Rationale |
|---|---|
| `name` | Display label (replaces free-text `applications.program`) |
| `code` | Short unique code per org — useful for application number generation, reports |
| `department` | Grouping for reporting; optional |
| `duration` / `duration_months` | Human-readable + computable duration |
| `total_fee` | Default fee for this course — can be overridden per application |
| `total_seats` | Enables future seat tracking/waitlist logic |

> [!NOTE]
> A `course_branches` join table for course-branch mapping is **deferred** to a later phase. For now, courses are org-level. Branch-specific course availability can be tracked later.

---

#### 1.3 Database Schema — `course_sessions` Table (Course ↔ Session link)

✅ **Decision: Included in Phase 1.**

```sql
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
```

**Design Decisions:**
| Field | Rationale |
|---|---|
| `total_seats` | Overrides `courses.total_seats` for a specific session (e.g., MBA may have 60 seats in 2025-26 but 80 in 2026-27) |
| `fee_amount` | Overrides `courses.total_fee` for a specific session (fee revisions across years) |
| `is_active` | Controls whether this course is open for applications in this specific session |
| `created_by` / `updated_by` | Audit trail consistent with other tables |

---

#### 1.4 Database Schema — `leads` Table Modification

✅ **Decision: Add `course_id` to leads.**

```sql
-- Add course_id column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS course_id UUID;

-- Add FK constraint
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
```

> [!NOTE]
> `course_id` on leads is nullable and optional. A lead may express interest in a course before an application is created. When a lead is converted to an application, the `course_id` can be carried over. Leads interested in multiple courses can have multiple lead records or use the existing `raw_payload` JSONB for additional course interests.

---

### Phase 2 — NestJS Module: `academic-sessions`

#### [NEW] `src/modules/academic-sessions/entities/academic-session.entity.ts`

TypeORM entity mapping to `academic_sessions` table. Fields:
- `id`, `organizationId`, `name`, `displayName`, `startDate`, `endDate`, `isCurrent`, `isActive`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- `@ManyToOne(() => Organization)` relation

#### [NEW] `src/modules/academic-sessions/dto/create-academic-session.dto.ts`

```typescript
class CreateAcademicSessionDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  name: string;              // e.g., '2025-26'

  @IsOptional() @IsString() @MaxLength(100)
  displayName?: string;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsBoolean()
  isCurrent?: boolean;       // defaults to false

  @IsOptional() @IsBoolean()
  isActive?: boolean;        // defaults to true
}
```

#### [NEW] `src/modules/academic-sessions/dto/update-academic-session.dto.ts`

PartialType of `CreateAcademicSessionDto`.

#### [NEW] `src/modules/academic-sessions/academic-sessions.service.ts`

| Method | Logic |
|---|---|
| `create(orgId, dto, actorId)` | Validate name uniqueness per org. If `isCurrent = true`, unset other current sessions for the same org. Save. |
| `findAllByOrg(orgId, pagination)` | Paginated list, ordered by `createdAt DESC`. |
| `findOne(id, orgId)` | Fetch by ID + orgId. 404 if not found. |
| `findCurrentSession(orgId)` | Returns the session where `isCurrent = true`. |
| `update(id, orgId, dto, actorId)` | Update fields. If `isCurrent` set to `true`, unset others. If `isActive` set to `false`, ensure no active applications reference this session name (warning, not blocking). |
| `remove(id, orgId)` | Soft-delete by setting `isActive = false`. Hard delete only if no applications reference this session name. |

**Key business rule:** Only one `isCurrent = true` per organization at any time. The service must enforce this atomically.

#### [NEW] `src/modules/academic-sessions/academic-sessions.controller.ts`

| Endpoint | Method | Roles | Description |
|---|---|---|---|
| `POST /organizations/:orgId/academic-sessions` | create | SUPERADMIN, ORG_ADMIN | Create a new session |
| `GET /organizations/:orgId/academic-sessions` | findAll | SUPERADMIN, ORG_ADMIN, APPLICATION_MANAGER, COUNSELOR | List all sessions |
| `GET /organizations/:orgId/academic-sessions/current` | findCurrent | ALL authenticated | Get the current active session |
| `GET /organizations/:orgId/academic-sessions/:id` | findOne | SUPERADMIN, ORG_ADMIN | Get session details |
| `PATCH /organizations/:orgId/academic-sessions/:id` | update | SUPERADMIN, ORG_ADMIN | Update session |
| `DELETE /organizations/:orgId/academic-sessions/:id` | remove | SUPERADMIN, ORG_ADMIN | Soft-delete / archive |

> [!NOTE]
> Route pattern follows existing convention: `organizations/:orgId/branches`. Academic sessions are scoped under the same org-level pattern.

#### [NEW] `src/modules/academic-sessions/academic-sessions.module.ts`

Registers entity with TypeORM, provides service, exports service for injection into other modules.

---

### Phase 3 — NestJS Module: `courses`

#### [NEW] `src/modules/courses/entities/course.entity.ts`

TypeORM entity mapping to `courses` table. Fields:
- `id`, `organizationId`, `name`, `code`, `description`, `department`, `duration`, `durationMonths`, `totalFee`, `totalSeats`, `isActive`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- `@ManyToOne(() => Organization)` relation

#### [NEW] `src/modules/courses/dto/create-course.dto.ts`

```typescript
class CreateCourseDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name: string;              // e.g., 'PGDM'

  @IsOptional() @IsString() @MaxLength(50)
  code?: string;             // e.g., 'PGDM-01'

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString() @MaxLength(255)
  department?: string;

  @IsOptional() @IsString() @MaxLength(50)
  duration?: string;         // e.g., '2 Years'

  @IsOptional() @IsInt() @Min(1)
  durationMonths?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 })
  totalFee?: number;

  @IsOptional() @IsInt() @Min(0)
  totalSeats?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
```

#### [NEW] `src/modules/courses/dto/update-course.dto.ts`

PartialType of `CreateCourseDto`.

#### [NEW] `src/modules/courses/courses.service.ts`

| Method | Logic |
|---|---|
| `create(orgId, dto, actorId)` | Validate code uniqueness per org (if code provided). Save. |
| `findAllByOrg(orgId, pagination, filters?)` | Paginated list. Optional filters: `isActive`, `department`, `search` (name/code). |
| `findOne(id, orgId)` | Fetch by ID + orgId. 404 if not found. |
| `update(id, orgId, dto, actorId)` | Update fields. Validate code uniqueness if changed. |
| `remove(id, orgId)` | Soft-delete by setting `isActive = false`. Check if active applications reference this course_id; warn but don't block. |
| `validateCourseExists(courseId, orgId)` | Utility method — checks that a course exists and is active for the org. Throws `BadRequestException` if not. **This will be called by ApplicationsService.** |

#### [NEW] `src/modules/courses/courses.controller.ts`

| Endpoint | Method | Roles | Description |
|---|---|---|---|
| `POST /organizations/:orgId/courses` | create | SUPERADMIN, ORG_ADMIN | Create a new course |
| `GET /organizations/:orgId/courses` | findAll | SUPERADMIN, ORG_ADMIN, APPLICATION_MANAGER, COUNSELOR | List courses (with filters) |
| `GET /organizations/:orgId/courses/:id` | findOne | SUPERADMIN, ORG_ADMIN | Get course details |
| `PATCH /organizations/:orgId/courses/:id` | update | SUPERADMIN, ORG_ADMIN | Update course |
| `DELETE /organizations/:orgId/courses/:id` | remove | SUPERADMIN, ORG_ADMIN | Soft-delete / archive |

#### [NEW] `src/modules/courses/courses.module.ts`

Registers entity with TypeORM, provides service, exports service for injection.

---

### Phase 3b — NestJS Module: `course-sessions`

#### [NEW] `src/modules/course-sessions/entities/course-session.entity.ts`

TypeORM entity mapping to `course_sessions` table. Fields:
- `id`, `organizationId`, `courseId`, `academicSessionId`, `totalSeats`, `feeAmount`, `isActive`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- `@ManyToOne(() => Organization)` relation
- `@ManyToOne(() => Course)` relation
- `@ManyToOne(() => AcademicSession)` relation

#### [NEW] `src/modules/course-sessions/dto/create-course-session.dto.ts`

```typescript
class CreateCourseSessionDto {
  @IsUUID() @IsNotEmpty()
  courseId: string;

  @IsUUID() @IsNotEmpty()
  academicSessionId: string;

  @IsOptional() @IsInt() @Min(0)
  totalSeats?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 })
  feeAmount?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;         // defaults to true
}
```

#### [NEW] `src/modules/course-sessions/dto/update-course-session.dto.ts`

PartialType of `CreateCourseSessionDto` (excluding `courseId` and `academicSessionId` — these are immutable after creation).

```typescript
class UpdateCourseSessionDto {
  @IsOptional() @IsInt() @Min(0)
  totalSeats?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 })
  feeAmount?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
```

#### [NEW] `src/modules/course-sessions/course-sessions.service.ts`

| Method | Logic |
|---|---|
| `create(orgId, dto, actorId)` | Validate that `courseId` exists and is active in the org. Validate that `academicSessionId` exists and is active in the org. Check unique constraint `(org, course, session)`. Save. |
| `findAllByOrg(orgId, pagination, filters?)` | Paginated list with eager-loaded `course` and `academicSession` relations. Optional filters: `courseId`, `academicSessionId`, `isActive`. |
| `findByCourseAndSession(courseId, sessionId, orgId)` | Lookup specific course-session combo. Returns seat/fee overrides. |
| `findOne(id, orgId)` | Fetch by ID + orgId with relations. 404 if not found. |
| `update(id, orgId, dto, actorId)` | Update seats/fee/active status. |
| `remove(id, orgId)` | Soft-delete by setting `isActive = false`. |

#### [NEW] `src/modules/course-sessions/course-sessions.controller.ts`

| Endpoint | Method | Roles | Description |
|---|---|---|---|
| `POST /organizations/:orgId/course-sessions` | create | SUPERADMIN, ORG_ADMIN | Link a course to a session with optional overrides |
| `GET /organizations/:orgId/course-sessions` | findAll | SUPERADMIN, ORG_ADMIN, APPLICATION_MANAGER, COUNSELOR | List all course-session links (with filters) |
| `GET /organizations/:orgId/course-sessions/:id` | findOne | SUPERADMIN, ORG_ADMIN | Get course-session details |
| `PATCH /organizations/:orgId/course-sessions/:id` | update | SUPERADMIN, ORG_ADMIN | Update seats/fee override |
| `DELETE /organizations/:orgId/course-sessions/:id` | remove | SUPERADMIN, ORG_ADMIN | Soft-delete |

#### [NEW] `src/modules/course-sessions/course-sessions.module.ts`

Imports `CoursesModule` and `AcademicSessionsModule` for validation. Registers `CourseSession` entity with TypeORM. Exports service.

---

### Phase 4 — Modifications to Existing Modules

---

#### 4.1 [MODIFY] [application.entity.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/applications/entities/application.entity.ts)

**Add ManyToOne relation to `Course` entity:**

```diff
+import { Course } from '../../courses/entities/course.entity.js';

   @Column({ name: 'course_id', nullable: true })
   courseId: string;

+  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
+  @JoinColumn({ name: 'course_id' })
+  course: Course;
```

> [!NOTE]
> `program` column is **kept as-is** for backward compatibility. It continues to serve as a denormalized display label. When a course is selected, `program` is auto-populated from `course.name`. This ensures existing queries that use `program` (e.g., dashboard stats) continue to work without modification.

---

#### 4.2 [MODIFY] [applications.service.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/applications/applications.service.ts)

**Changes in `create()` method (around line 250):**

```diff
  // 1. Validate courseId against courses table
+ const course = await this.coursesService.validateCourseExists(dto.courseId, orgId);

  // 2. Auto-populate program from course name if not provided
+ const program = dto.program || course.name;

  // In the application creation (around line 300):
-   program: dto.program || undefined,
+   program: program,
```

**Changes in `checkDuplicateApplication()` method (line 83-104):**

No structural change needed — it already uses `courseId` for the duplicate check. The only improvement is the error message can now include the course name:

```diff
- `An active application already exists for ${email} in course ${courseId} for session ${academicSession}. `
+ `An active application already exists for ${email} in course "${courseName}" for session ${academicSession}. `
```

**Inject `CoursesService` into `ApplicationsService` constructor (line 43-55):**

```diff
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    // ... existing injections ...
+   private readonly coursesService: CoursesService,
  ) {}
```

---

#### 4.3 [MODIFY] [applications.module.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/applications/applications.module.ts)

```diff
+ import { CoursesModule } from '../courses/courses.module.js';

  @Module({
    imports: [
      TypeOrmModule.forFeature([...]),
      LeadsModule,
+     CoursesModule,
    ],
    ...
  })
```

---

#### 4.4 [MODIFY] [create-application.dto.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/applications/dto/create-application.dto.ts)

No structural change needed — `courseId` is already `@IsUUID() @IsNotEmpty()` (required). `program` remains `@IsOptional() @IsString()` since it can be auto-populated from the course.

---

#### 4.5 [MODIFY] [lead.entity.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/leads/entities/lead.entity.ts)

**Add `course_id` column and ManyToOne relation to `Course`:**

```diff
+import { Course } from '../../courses/entities/course.entity.js';

+  @Column({ name: 'course_id', type: 'uuid', nullable: true })
+  courseId: string;
+
+  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
+  @JoinColumn({ name: 'course_id' })
+  course: Course;
```

---

#### 4.6 [MODIFY] Lead DTOs

**Add `courseId` to create and update DTOs for leads:**

- [create-lead.dto.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/leads/dto/create-lead.dto.ts): Add optional `@IsUUID() courseId?: string`
- Update lead DTO: Add optional `@IsUUID() courseId?: string`

The leads service should **not** validate that `courseId` references an active course — leads are exploratory and the course may not be finalized yet. The FK constraint at the DB level provides basic integrity.

---

#### 4.7 [MODIFY] [leads.module.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/leads/leads.module.ts)

No module import changes needed — the `Course` entity is referenced only via the `@ManyToOne` decorator in `lead.entity.ts`. TypeORM resolves this automatically via `autoLoadEntities: true` in the app module config.

---

#### 4.8 [MODIFY] [app.module.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/app.module.ts)

```diff
+ import { CoursesModule } from './modules/courses/courses.module.js';
+ import { AcademicSessionsModule } from './modules/academic-sessions/academic-sessions.module.js';
+ import { CourseSessionsModule } from './modules/course-sessions/course-sessions.module.js';

  @Module({
    imports: [
      // ... existing modules ...
      ApplicationsModule,
+     CoursesModule,
+     AcademicSessionsModule,
+     CourseSessionsModule,
    ],
    ...
  })
```

---

#### 4.9 [MODIFY] [Database.sql](file:///c:/educrm_main/admissions-tenant-api-main/Database.sql)

Add the `academic_sessions`, `courses`, and `course_sessions` CREATE TABLE statements (from sections 1.1, 1.2, 1.3 above) **before** the applications table section. Add `course_id` to `leads` (section 1.4). Add the FK constraints on `applications.course_id` and `leads.course_id`:

```sql
-- Add FK constraint on applications.course_id (after courses table exists)
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

-- Add course_id column and FK to leads
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
```

> [!WARNING]
> The FK constraint on `applications.course_id` requires that all existing values either be `NULL` or reference valid rows in the `courses` table. See **Phase 5 — Data Migration** for handling existing data.

---

### Phase 5 — Data Migration Strategy

Existing applications may have `course_id` UUIDs that don't correspond to any row in the new `courses` table, and `academic_session` values that don't exist in `academic_sessions`.

#### Step 1: Seed `academic_sessions` from existing data

```sql
-- Extract unique sessions from existing applications and create master records
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
```

Then manually (or via API) mark the appropriate session as `is_current = true` per org.

#### Step 2: Seed `courses` from existing data

```sql
-- Extract unique programs from existing applications and create course records
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
```

#### Step 3: Backfill `course_id` on existing applications

```sql
-- Update applications to reference the newly created course records
UPDATE applications a
SET course_id = c.id
FROM courses c
WHERE a.organization_id = c.organization_id
  AND a.program = c.name
  AND (a.course_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM courses c2 WHERE c2.id = a.course_id
  ));
```

#### Step 4: Apply FK constraint

Only after Step 3 ensures data integrity:

```sql
ALTER TABLE applications
    ADD CONSTRAINT fk_applications_course
    FOREIGN KEY (course_id)
    REFERENCES courses(id)
    ON DELETE SET NULL;
```

> [!CAUTION]
> Run Steps 1–4 in a transaction. If any step fails, rollback all changes. Test on a staging database first.

---

### Phase 6 — File Summary

#### New Files (18 files)

| # | File | Description |
|---|---|---|
| 1 | `src/modules/academic-sessions/entities/academic-session.entity.ts` | TypeORM entity for `academic_sessions` |
| 2 | `src/modules/academic-sessions/dto/create-academic-session.dto.ts` | Create DTO with validation |
| 3 | `src/modules/academic-sessions/dto/update-academic-session.dto.ts` | Update DTO (PartialType) |
| 4 | `src/modules/academic-sessions/academic-sessions.service.ts` | CRUD service + `isCurrent` enforcement |
| 5 | `src/modules/academic-sessions/academic-sessions.controller.ts` | REST controller with role guards |
| 6 | `src/modules/academic-sessions/academic-sessions.module.ts` | NestJS module definition |
| 7 | `src/modules/courses/entities/course.entity.ts` | TypeORM entity for `courses` |
| 8 | `src/modules/courses/dto/create-course.dto.ts` | Create DTO with validation |
| 9 | `src/modules/courses/dto/update-course.dto.ts` | Update DTO (PartialType) |
| 10 | `src/modules/courses/courses.service.ts` | CRUD service + `validateCourseExists()` |
| 11 | `src/modules/courses/courses.controller.ts` | REST controller with role guards |
| 12 | `src/modules/courses/courses.module.ts` | NestJS module definition |
| 13 | `src/modules/course-sessions/entities/course-session.entity.ts` | TypeORM entity for `course_sessions` |
| 14 | `src/modules/course-sessions/dto/create-course-session.dto.ts` | Create DTO with validation |
| 15 | `src/modules/course-sessions/dto/update-course-session.dto.ts` | Update DTO (seats/fee/active only) |
| 16 | `src/modules/course-sessions/course-sessions.service.ts` | CRUD service + cross-entity validation |
| 17 | `src/modules/course-sessions/course-sessions.controller.ts` | REST controller with role guards |
| 18 | `src/modules/course-sessions/course-sessions.module.ts` | NestJS module definition |

#### Modified Files (8 files)

| # | File | Change |
|---|---|---|
| 1 | [application.entity.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/applications/entities/application.entity.ts) | Add `@ManyToOne` to `Course` |
| 2 | [applications.service.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/applications/applications.service.ts) | Inject `CoursesService`, validate `courseId`, auto-populate `program` |
| 3 | [applications.module.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/applications/applications.module.ts) | Import `CoursesModule` |
| 4 | [lead.entity.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/modules/leads/entities/lead.entity.ts) | Add `courseId` column + `@ManyToOne` to `Course` |
| 5 | Lead DTOs (create + update) | Add optional `courseId` field |
| 6 | [app.module.ts](file:///c:/educrm_main/admissions-tenant-api-main/src/app.module.ts) | Import `CoursesModule` + `AcademicSessionsModule` + `CourseSessionsModule` |
| 7 | [Database.sql](file:///c:/educrm_main/admissions-tenant-api-main/Database.sql) | Add 3 new tables + `course_id` to leads + FK constraints + migration SQL |

---

## Resolved Decisions

| # | Question | Decision |
|---|---|---|
| Q1 | `course_sessions` table — include now or defer? | ✅ **Include now.** Phase 3b adds a full `course-sessions` NestJS module with CRUD APIs. |
| Q2 | `academicSession` on applications — FK or VARCHAR? | ✅ **Keep as VARCHAR.** `academic_sessions` table serves as a master list for UI dropdowns. Applications store the session name directly. No FK. The duplicate-prevention unique index continues to use the string value unchanged. |
| Q3 | Course deactivation — block or warn? | ✅ **Warn-only.** When `isActive` is set to `false`, the API returns a warning in the response body listing the count of active applications referencing this course. Existing applications keep their `course_id`. New applications cannot select an inactive course (enforced by `validateCourseExists()` checking `isActive = true`). |
| Q4 | Leads table — add `course_id`? | ✅ **Include now.** A nullable `course_id UUID` FK is added to `leads` (Section 1.4, 4.5, 4.6). No strict validation in leads service — leads are exploratory. FK constraint at DB level provides basic integrity. |

---

## Verification Plan

### Automated Tests

```bash
# 1. Build check — ensure TypeScript compiles without errors
npm run build

# 2. Start the dev server — verify TypeORM auto-creates the new tables
npm run start:dev
# Check PostgreSQL for new tables: academic_sessions, courses

# 3. API smoke tests (via curl or Postman)
# Create academic session
POST /organizations/:orgId/academic-sessions
{ "name": "2025-26", "isCurrent": true }

# Create course
POST /organizations/:orgId/courses
{ "name": "PGDM", "code": "PGDM-01", "department": "Management", "duration": "2 Years" }

# Create application with valid courseId
POST /applications
{ "courseId": "<course-uuid>", "academicSession": "2025-26", ... }

# Verify duplicate prevention still works
POST /applications  (same email + courseId + session → should 400)

# Verify course validation
POST /applications
{ "courseId": "<non-existent-uuid>", ... }  → should 400
```

### Manual Verification

- [ ] Verify `academic_sessions` table is created in PostgreSQL with correct columns and constraints
- [ ] Verify `courses` table is created with correct columns and constraints
- [ ] Verify `course_sessions` table is created with correct columns, FKs, and unique constraint
- [ ] Verify unique constraint on `(organization_id, code)` for courses
- [ ] Verify unique constraint on `(organization_id, name)` for academic sessions
- [ ] Verify unique constraint on `(organization_id, course_id, academic_session_id)` for course_sessions
- [ ] Verify `isCurrent` enforcement — only one current session per org
- [ ] Verify `application.course_id` FK relation loads when fetching application details
- [ ] Verify `program` is auto-populated from `course.name` when not explicitly provided
- [ ] Verify existing application creation flow continues to work
- [ ] Verify duplicate prevention still works with the validated `courseId`
- [ ] Verify course deactivation returns a warning with active application count
- [ ] Verify deactivated courses cannot be selected for new applications
- [ ] Verify `leads.course_id` column exists and FK constraint works
- [ ] Verify lead creation/update with `courseId` works
- [ ] Verify course-session CRUD: create, list, update seats/fee, soft-delete
- [ ] Run data migration script on a test database with existing application data
