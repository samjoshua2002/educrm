# Backend Implementation Plan — Form Module (DB + APIs)

> Goal: Build a **production-ready backend** aligned with frontend plan (JSON fields, JSON responses, optional campaign, no autosave, overwrite schema).

---

# 1. Tech Assumptions

* Backend: Node.js (NestJS or Express)
* DB: PostgreSQL
* ORM: Prisma / TypeORM / Sequelize (any)
* Auth: JWT (already exists)

---

# 2. Core Design Decisions (Locked)

* Form created at "Create Form"
* Fields stored as **JSONB**
* Responses stored as **JSONB**
* Campaign is **optional**
* Duplicate submissions → insert but mark `is_duplicate`
* Schema overwrite allowed (NO versioning for now)
* No autosave (manual save only)

---

# 3. Database Schema

---

## 3.1 forms

```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft | active | expired
  campaign_id UUID NULL,

  fields JSONB NOT NULL DEFAULT '[]',

  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3.2 form_templates

```sql
CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  fields JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3.3 form_responses

```sql
CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  data JSONB NOT NULL,

  status VARCHAR(20) DEFAULT 'pending', -- verified | pending | rejected
  is_duplicate BOOLEAN DEFAULT FALSE,

  submitted_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3.4 Indexes (IMPORTANT)

```sql
CREATE INDEX idx_forms_org ON forms(organization_id);
CREATE INDEX idx_responses_form ON form_responses(form_id);
CREATE INDEX idx_responses_org ON form_responses(organization_id);
CREATE INDEX idx_responses_data_email ON form_responses((data->>'email'));
```

---

# 4. API Design

Base URL:

```
/api/organizations/:orgId
```

---

# 4.1 Forms APIs

## Create Form

```
POST /forms
```

### Body

```json
{
  "name": "UG Admission Form",
  "campaignId": null
}
```

---

## Get All Forms

```
GET /forms
```

### Query Params

* search
* status

---

## Get Single Form

```
GET /forms/:id
```

---

## Update Form (Save Draft / Publish)

```
PATCH /forms/:id
```

### Body

```json
{
  "name": "Updated Name",
  "fields": [...],
  "status": "active"
}
```

---

## Delete Form

```
DELETE /forms/:id
```

---

## Duplicate Form

```
POST /forms/:id/duplicate
```

---

# 4.2 Template APIs

## Get Templates

```
GET /form-templates
```

---

# 4.3 Response APIs

---

## Submit Form (Public)

```
POST /forms/:formId/submit
```

### Body

```json
{
  "data": {
    "name": "John",
    "email": "john@example.com"
  }
}
```

---

### Duplicate Logic

```ts
const existing = findByEmailAndForm(email, formId);

if (existing) {
  is_duplicate = true;
}
```

---

## Get Responses

```
GET /forms/:id/responses
```

### Query

* search
* status
* page

---

## Update Response Status

```
PATCH /responses/:id
```

### Body

```json
{
  "status": "verified"
}
```

---

# 5. Business Logic

---

## 5.1 Form Creation Flow

1. Create form (draft)
2. Assign template fields (optional)
3. User edits in builder
4. Save → update JSON
5. Publish → set status = active

---

## 5.2 Submission Flow

1. Validate form status (must be active)
2. Extract email (if exists)
3. Check duplicate
4. Insert response

---

## 5.3 Campaign Logic

* If form has campaign → attach to lead
* If not → NULL

---

# 6. Security

---

## Role Access

| Action         | Role                  |
| -------------- | --------------------- |
| Create Form    | superadmin, org_admin |
| Edit Form      | superadmin, org_admin |
| Delete Form    | superadmin, org_admin |
| View Responses | superadmin, org_admin |

---

## Public Endpoint

* `/submit` is public
* Add:

  * Rate limiting
  * Basic validation

---

# 7. Validation Layer

---

* Required fields check
* Email format validation
* Field type validation

---

# 8. Future Enhancements (Not Now)

* Versioning system
* Analytics tables
* Conditional logic engine
* File uploads
* Payment integration

---

# 9. Final Notes

* JSONB gives flexibility but requires discipline
* Keep field structure consistent
* Avoid changing field IDs after publish

---

# 10. Execution Order

1. DB schema
2. Form APIs
3. Template APIs
4. Submission API
5. Response APIs
6. Auth + Guards

---

**Build clean. Don’t overcomplicate. Ship fast but structured.**
