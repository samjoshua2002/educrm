# Admission System — API Documentation (Phase 1.1)

This document lists all available API endpoints for Phase 1. 
**Base URL**: `http://localhost:3000/api`

**Standard Response Structure (All APIs)**:
```json
{
    "success": true,
    "data": { ... } or [ ... ],
    "message": "Dynamic message describing the outcome",
    "pagination": { ... } // Only for list GET requests
}
```

**Standard Error Response Structure**:
```json
{
    "success": false,
    "message": "Human-readable error message",
    "errors": { "field": "error detail" }, // Only for 400/422 validation errors
    "timestamp": "ISO-8601-String"
}
```

---

## Role-Based Access Control (RBAC) Matrix

| Module | API Endpoint | Superadmin | Org Admin | Staff (Others) |
| :--- | :--- | :---: | :---: | :---: |
| **Auth** | `POST /auth/login` | ✅ | ✅ | ✅ |
| **Auth** | `POST /auth/register-superadmin` | ✅ (Bootstrap) | ❌ | ❌ |
| **Orgs** | `POST /api/organizations` | ✅ | ❌ | ❌ |
| **Orgs** | `GET /api/organizations` | ✅ | ❌ | ❌ |
| **Orgs** | `GET /api/organizations/:id` | ✅ | ✅ (Own) | ❌ |
| **Orgs** | `PATCH /api/organizations/:id` | ✅ (All fields) | ✅ (Profile only) | ❌ |
| **Branches** | `POST /api/organizations/:orgId/branches` | ✅ | ✅ | ❌ |
| **Branches** | `GET /api/organizations/:orgId/branches` | ✅ | ✅ | ❌ |
| **Users** | `GET /api/users/me` | ✅ | ✅ | ✅ |
| **Users** | `POST /api/organizations/:orgId/users` | ✅ | ✅ | ❌ |
| **Users** | `GET /api/organizations/:orgId/users` | ✅ | ✅ | ❌ |
| **Users** | `PATCH /api/organizations/:orgId/users/:id` | ✅ | ✅ | ❌ |
| **Forms** | `GET /api/organizations/:orgId/forms` | ✅ | ✅ | ❌ |
| **Forms** | `GET /api/organizations/:orgId/forms/:id` | ✅ | ✅ | ❌ |
| **Forms** | `POST /api/organizations/:orgId/forms` | ✅ | ✅ | ❌ |
| **Forms** | `PATCH /api/organizations/:orgId/forms/:id` | ✅ | ✅ | ❌ |
| **Forms** | `DELETE /api/organizations/:orgId/forms/:id` | ✅ | ✅ | ❌ |
| **Forms** | `POST /api/organizations/:orgId/forms/:id/duplicate` | ✅ | ✅ | ❌ |
| **Templates** | `GET /api/form-templates` | ✅ | ✅ | ❌ |
| **Public** | `GET /api/public/forms/:slug` | Public | Public | Public |
| **Ingestion**| `POST /api/public/forms/:slug/submit` | Public | Public | Public |
| **Leads** | `GET /api/organizations/:orgId/leads` | ✅ | ✅ | ✅ |
| **Leads** | `GET /api/organizations/:orgId/leads/:id` | ✅ | ✅ | ✅ |
| **Leads** | `PATCH /api/organizations/:orgId/leads/:id/status` | ✅ | ✅ | ❌ |
| **Leads** | `PATCH /api/organizations/:orgId/leads/:id/verify` | ✅ | ✅ | ❌ |
| **Leads** | `PATCH /api/organizations/:orgId/leads/:id/assign` | ✅ | ✅ | ❌ |
| **Leads** | `POST /api/organizations/:orgId/leads/:id/notes` | ✅ | ✅ | ✅ |
| **Leads** | `PATCH /api/organizations/:orgId/leads/:id/workflow-status` | ✅ | ✅ | ✅ |
| **Leads** | `PATCH /api/organizations/:orgId/leads/:id/close` | ✅ | ✅ | ✅ |
| **Leads** | `DELETE /api/organizations/:orgId/leads/:id` | ✅ | ✅ | ❌ |
| **Responses** | `GET /api/organizations/:orgId/forms/:id/responses` | ✅ | ✅ | ❌ |
| **Responses** | `PATCH /api/responses/:id` | ✅ | ✅ | ❌ |

---

## Complete Endpoint Examples (RBAC Matrix)

Each endpoint below follows the required complete format:
- **Description**
- **Method & URL**
- **Headers**
- **Parameters**
- **Request Example**
- **Response Example**

### 1) Auth

#### POST /api/auth/login
- **Description**: Authenticate user and return access token + profile.
- **Method & URL**: `POST /api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Parameters**: None
- **Request Example**:
```json
{
  "email": "admin@admission.com",
  "password": "strongpassword123"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "access_token": "jwt-token",
    "user": { "id": "uuid", "name": "Super Admin", "role": "superadmin", "organizationId": null }
  },
  "message": "Login successful"
}
```

#### POST /api/auth/register-superadmin
- **Description**: Bootstrap endpoint to create first superadmin.
- **Method & URL**: `POST /api/auth/register-superadmin`
- **Headers**: `Content-Type: application/json`
- **Parameters**: None
- **Request Example**:
```json
{
  "name": "Super Admin",
  "email": "admin@admission.com",
  "password": "strongpassword123"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Super Admin", "email": "admin@admission.com", "role": "superadmin" },
  "message": "Superadmin registered successfully"
}
```

### 2) Organizations

#### POST /api/organizations
- **Description**: Create a new tenant organization.
- **Method & URL**: `POST /api/organizations`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: None
- **Request Example**:
```json
{
  "name": "Institute of Technology",
  "slug": "iot-main",
  "email": "contact@iot.edu",
  "phone": "9876543210",
  "address": "123 Campus Road",
  "subscriptionStart": "2024-01-01T00:00:00Z",
  "subscriptionEnd": "2025-01-01T00:00:00Z"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Institute of Technology", "slug": "iot-main" },
  "message": "Organization created successfully"
}
```

#### GET /api/organizations
- **Description**: List organizations with pagination.
- **Method & URL**: `GET /api/organizations?page=1&limit=10`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Query: `page`, `limit`
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": [{ "id": "uuid", "name": "Institute 1" }],
  "pagination": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 },
  "message": "Organizations fetched successfully"
}
```

#### GET /api/organizations/:id
- **Description**: Get single organization details.
- **Method & URL**: `GET /api/organizations/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `id` (uuid)
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Institute of Technology", "status": "active" },
  "message": "Organization details fetched successfully"
}
```

#### PATCH /api/organizations/:id
- **Description**: Update organization profile/settings.
- **Method & URL**: `PATCH /api/organizations/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `id` (uuid)
- **Request Example**:
```json
{
  "name": "Updated Institute Name",
  "email": "new@iot.edu",
  "phone": "9876543210"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Updated Institute Name", "email": "new@iot.edu" },
  "message": "Organization updated successfully"
}
```

### 3) Branches

#### POST /api/organizations/:orgId/branches
- **Description**: Create branch under organization.
- **Method & URL**: `POST /api/organizations/:orgId/branches`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid)
- **Request Example**:
```json
{
  "name": "North Campus",
  "code": "NC-01",
  "address": "Sector 5",
  "city": "Delhi",
  "state": "Delhi"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "North Campus", "organizationId": "org-uuid" },
  "message": "Branch created successfully"
}
```

#### GET /api/organizations/:orgId/branches
- **Description**: List branches for organization.
- **Method & URL**: `GET /api/organizations/:orgId/branches?page=1&limit=10`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid)
  - Query: `page`, `limit`
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": [{ "id": "uuid", "name": "North Campus" }],
  "pagination": { "page": 1, "limit": 10, "total": 2, "totalPages": 1 },
  "message": "Branches fetched successfully"
}
```

### 4) Users

#### GET /api/users/me
- **Description**: Get current authenticated user profile.
- **Method & URL**: `GET /api/users/me`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: None
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Jane Doe", "role": "org_admin", "organizationId": "org-uuid" },
  "message": "Profile fetched successfully"
}
```

#### POST /api/organizations/:orgId/users
- **Description**: Create organization staff user.
- **Method & URL**: `POST /api/organizations/:orgId/users`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid)
- **Request Example**:
```json
{
  "name": "Jane Doe",
  "email": "jane@iot.edu",
  "password": "staffpassword123",
  "role": "counselor",
  "phone": "9988776655",
  "branchId": "uuid-optional"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Jane Doe", "role": "counselor", "organizationId": "org-uuid" },
  "message": "Staff user created successfully"
}
```

#### GET /api/organizations/:orgId/users
- **Description**: List organization staff users.
- **Method & URL**: `GET /api/organizations/:orgId/users?page=1&limit=10`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid)
  - Query: `page`, `limit`
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": [{ "id": "uuid", "name": "Jane Doe", "role": "counselor" }],
  "pagination": { "page": 1, "limit": 10, "total": 12, "totalPages": 2 },
  "message": "Staff users fetched successfully"
}
```

#### PATCH /api/organizations/:orgId/users/:id
- **Description**: Update user role/status/profile fields.
- **Method & URL**: `PATCH /api/organizations/:orgId/users/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{
  "role": "lead_manager",
  "isActive": false
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "role": "lead_manager", "isActive": false },
  "message": "User updated successfully"
}
```

### 5) Forms

#### POST /api/organizations/:orgId/forms
- **Description**: Create form for lead capture.
- **Method & URL**: `POST /api/organizations/:orgId/forms`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: Path `orgId` (uuid)
- **Request Example**:
```json
{
  "name": "UG Admission 2024",
  "slug": "ug-admission-2024",
  "campaignId": "uuid-optional"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "UG Admission 2024", "status": "draft" },
  "message": "Form created successfully"
}
```

#### GET /api/organizations/:orgId/forms
- **Description**: List forms with filters.
- **Method & URL**: `GET /api/organizations/:orgId/forms?page=1&limit=10&search=UG&status=active`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: Path `orgId` (uuid), Query `page`, `limit`, `search`, `status`
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": [{ "id": "uuid", "name": "UG Admission 2024", "status": "active" }],
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 },
  "message": "Forms fetched successfully"
}
```

#### GET /api/organizations/:orgId/forms/:id
- **Description**: Get single form details.
- **Method & URL**: `GET /api/organizations/:orgId/forms/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "UG Admission 2024", "fields": [] },
  "message": "Form details fetched successfully"
}
```

#### PATCH /api/organizations/:orgId/forms/:id
- **Description**: Update form schema/status.
- **Method & URL**: `PATCH /api/organizations/:orgId/forms/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{
  "name": "Updated Name",
  "slug": "updated-name",
  "fields": [{ "id": "email", "label": "Email", "type": "email", "required": true }],
  "status": "active"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Updated Name", "status": "active" },
  "message": "Form updated successfully"
}
```

#### DELETE /api/organizations/:orgId/forms/:id
- **Description**: Delete form.
- **Method & URL**: `DELETE /api/organizations/:orgId/forms/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": null,
  "message": "Form deleted successfully"
}
```

#### POST /api/organizations/:orgId/forms/:id/duplicate
- **Description**: Duplicate existing form.
- **Method & URL**: `POST /api/organizations/:orgId/forms/:id/duplicate`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "new-uuid", "name": "UG Admission 2024 (Copy)" },
  "message": "Form duplicated successfully"
}
```

### 6) Templates

#### GET /api/form-templates
- **Description**: List active form templates.
- **Method & URL**: `GET /api/form-templates`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: None
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": [{ "id": "uuid", "name": "Standard Admission Template", "fields": [] }],
  "message": "Form templates fetched successfully"
}
```

### 7) Public + Ingestion

#### GET /api/public/forms/:slug
- **Description**: Fetch public form schema by slug.
- **Method & URL**: `GET /api/public/forms/:slug`
- **Headers**: `Content-Type: application/json`
- **Parameters**: Path `slug` (string)
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "UG Admission 2024", "slug": "ug-admission-2024", "fields": [] },
  "message": "Form configuration fetched successfully"
}
```

#### POST /api/public/forms/:slug/submit
- **Description**: Submit public form and ingest lead.
- **Method & URL**: `POST /api/public/forms/:slug/submit`
- **Headers**: `Content-Type: application/json`
- **Parameters**: Path `slug` (string)
- **Request Example**:
```json
{
  "data": {
    "full_name": "John Doe",
    "phone": "9876543210",
    "location": "branch-uuid",
    "email": "john@example.com"
  },
  "utmData": {
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "adset_1"
  },
  "source": "fb_ad"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "success": true },
  "message": "Form submitted successfully"
}
```

### 8) Leads

#### GET /api/organizations/:orgId/leads
- **Description**: List leads with filters and pagination.
- **Method & URL**: `GET /api/organizations/:orgId/leads?page=1&limit=10&search=John&status=verified&assignedTo=me&followUpDate=2026-05-28&scoreBand=hot`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: Path `orgId` (uuid); Query `page`, `limit`, `search`, `status`, `assignedTo`, `followUpDate`, `scoreBand`
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": [{ "id": "uuid", "firstName": "John", "status": "verified", "scoreBand": "hot" }],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 },
  "message": "Leads fetched successfully"
}
```

#### GET /api/organizations/:orgId/leads/:id
- **Description**: Get lead details by id.
- **Method & URL**: `GET /api/organizations/:orgId/leads/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "firstName": "John", "status": "verified" },
  "message": "Lead details fetched successfully"
}
```

#### PATCH /api/organizations/:orgId/leads/:id/status
- **Description**: Basic status update endpoint.
- **Method & URL**: `PATCH /api/organizations/:orgId/leads/:id/status`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{
  "status": "verified"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "verified" },
  "message": "Lead status updated successfully"
}
```

#### PATCH /api/organizations/:orgId/leads/:id/verify
- **Description**: Verify (qualify/disqualify) an unverified lead.
- **Method & URL**: `PATCH /api/organizations/:orgId/leads/:id/verify`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{
  "action": "qualify",
  "reason": "Valid contact and genuine admission intent"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "verified", "verifiedBy": "uuid", "verifiedAt": "2026-05-28T03:41:00.000Z" },
  "message": "Lead verified successfully"
}
```

#### PATCH /api/organizations/:orgId/leads/:id/assign
- **Description**: Reassign lead to counselor in same organization.
- **Method & URL**: `PATCH /api/organizations/:orgId/leads/:id/assign`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{
  "assignedTo": "counselor-uuid",
  "reason": "Reassigned based on region specialization"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "assignedTo": "counselor-uuid", "assignedAt": "2026-05-28T03:43:00.000Z" },
  "message": "Lead assigned successfully"
}
```

#### POST /api/organizations/:orgId/leads/:id/notes
- **Description**: Add activity note and optional follow-up scheduling.
- **Method & URL**: `POST /api/organizations/:orgId/leads/:id/notes`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{
  "content": "Called student, interested in B.Tech CS. Requested callback on Saturday.",
  "disposition": "contacted_not_ready",
  "nextFollowUpAt": "2026-05-30T10:00:00.000Z"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "working", "nextFollowUpAt": "2026-05-30T10:00:00.000Z" },
  "message": "Lead note added successfully"
}
```

#### PATCH /api/organizations/:orgId/leads/:id/workflow-status
- **Description**: Update workflow lifecycle status.
- **Method & URL**: `PATCH /api/organizations/:orgId/leads/:id/workflow-status`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{
  "status": "working",
  "reason": "Counseling conversation started"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "working" },
  "message": "Lead workflow status updated successfully"
}
```

#### PATCH /api/organizations/:orgId/leads/:id/close
- **Description**: Close lead with reason and notes.
- **Method & URL**: `PATCH /api/organizations/:orgId/leads/:id/close`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{
  "reason": "not_interested",
  "notes": "Student confirmed they are not pursuing this cycle."
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "closed", "closureReason": "not_interested" },
  "message": "Lead closed successfully"
}
```

#### DELETE /api/organizations/:orgId/leads/:id
- **Description**: Delete a lead record.
- **Method & URL**: `DELETE /api/organizations/:orgId/leads/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: Path `orgId` (uuid), `id` (uuid)
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": null,
  "message": "Lead deleted successfully"
}
```

### 9) Responses

#### GET /api/organizations/:orgId/forms/:id/responses
- **Description**: List form responses with pagination and status filter.
- **Method & URL**: `GET /api/organizations/:orgId/forms/:id/responses?page=1&limit=10&status=pending`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: Path `orgId` (uuid), `id` (uuid); Query `page`, `limit`, `status`
- **Request Example**:
```json
{}
```
- **Response Example**:
```json
{
  "success": true,
  "data": [{ "id": "uuid", "status": "pending", "isDuplicate": false }],
  "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 },
  "message": "Form responses fetched successfully"
}
```

#### PATCH /api/responses/:id
- **Description**: Update moderation status of a response.
- **Method & URL**: `PATCH /api/responses/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: Path `id` (uuid)
- **Request Example**:
```json
{
  "status": "verified"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "verified" },
  "message": "Response status updated successfully"
}
```

---

### Lead Workflow Request Examples (Quick Reference)

#### `PATCH /api/organizations/:orgId/leads/:id/status`
```json
{
  "status": "verified"
}
```

#### `PATCH /api/organizations/:orgId/leads/:id/verify`
```json
{
  "action": "qualify",
  "reason": "Valid contact and genuine admission intent"
}
```

#### `PATCH /api/organizations/:orgId/leads/:id/assign`
```json
{
  "assignedTo": "counselor-uuid",
  "reason": "Reassigned based on region specialization"
}
```

#### `POST /api/organizations/:orgId/leads/:id/notes`
```json
{
  "content": "Called student, interested in B.Tech CS. Requested callback on Saturday.",
  "disposition": "contacted_not_ready",
  "nextFollowUpAt": "2026-05-30T10:00:00.000Z"
}
```

#### `PATCH /api/organizations/:orgId/leads/:id/workflow-status`
```json
{
  "status": "working",
  "reason": "Counseling conversation started"
}
```

---

## 5. Forms (Lead Capture)

### Create Form
- **Method**: `POST`
- **URL**: `/organizations/:orgId/forms`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Request Example**:
```json
{
  "name": "UG Admission 2024",
  "slug": "ug-admission-2024",
  "campaignId": "uuid-optional"
}
```
- **Response**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "UG Admission 2024", "status": "draft", ... },
  "message": "Form created successfully"
}
```

### Get Single Form Details
- **Method**: `GET`
- **URL**: `/organizations/:orgId/forms/:id`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Response**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "UG Admission 2024", "fields": [...], ... },
  "message": "Form details fetched successfully"
}
```

### Update Form (Fields / Status)
- **Method**: `PATCH`
- **URL**: `/organizations/:orgId/forms/:id`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Request Example**:
```json
{
  "name": "Updated Name",
  "slug": "updated-name",
  "fields": [
    { "id": "email", "label": "Email Address", "type": "email", "required": true }
  ],
  "status": "active"
}
```
- **Response**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Form updated successfully"
}
```

### List Forms (Paginated)
- **Method**: `GET`
- **URL**: `/organizations/:orgId/forms?page=1&limit=10&search=UG&status=active`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Response**:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 },
  "message": "Forms fetched successfully"
}
```

### Delete Form
- **Method**: `DELETE`
- **URL**: `/organizations/:orgId/forms/:id`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Response**:
```json
{
  "success": true,
  "message": "Form deleted successfully"
}
```

### Duplicate Form
- **Method**: `POST`
- **URL**: `/organizations/:orgId/forms/:id/duplicate`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Response**:
```json
{
  "success": true,
  "data": { "id": "new-uuid", "name": "UG Admission 2024 (Copy)", ... },
  "message": "Form duplicated successfully"
}
```

---

## 6. Form Templates

### List All Templates
- **Method**: `GET`
- **URL**: `/form-templates`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Response**:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Standard Admission Template", "fields": [...] }
  ],
  "message": "Form templates fetched successfully"
}
```

---

## 7. Public Form Handling

### Get Form Configuration (Public)
- **Method**: `GET`
- **URL**: `/public/forms/:slug`
- **Auth**: None (Public)
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "UG Admission 2024",
    "slug": "ug-admission-2024",
    "fields": [
      { "id": "fullname", "label": "Full Name", "type": "text", "required": true },
      { "id": "email", "label": "Email Address", "type": "email", "required": true }
    ]
  },
  "message": "Form configuration fetched successfully"
}
```

### Submit Public Form (Lead Ingestion)
- **Method**: `POST`
- **URL**: `/public/forms/:slug/submit`
- **Auth**: None (Public)
- **Request Example**:
```json
{
  "data": {
    "fullname": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210"
  },
  "utmData": {
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "adset_1"
  },
  "source": "fb_ad"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Form submitted successfully"
}
```

---

## 8. Leads Management

### List Leads (Paginated)
- **Method**: `GET`
- **URL**: `/organizations/:orgId/leads?page=1&limit=10&search=John&status=verified&assignedTo=me&followUpDate=2026-05-28&scoreBand=hot`
- **Auth**: Bearer Token (Superadmin, Org Admin, Lead Manager)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Path Params**:
  - `orgId` (uuid): Organization ID
- **Query Params**:
  - `page` (number, optional)
  - `limit` (number, optional)
  - `search` (string, optional)
  - `status` (string, optional): `unverified | verified | disqualified | working | converted | closed`
  - `assignedTo` (string, optional): user UUID or `me`
  - `followUpDate` (string, optional): `YYYY-MM-DD`
  - `scoreBand` (string, optional): `hot | warm | cold`
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "status": "verified",
      "assignedTo": "uuid",
      "verifiedBy": "uuid",
      "verifiedAt": "2026-05-28T03:40:00.000Z",
      "score": 74,
      "scoreBand": "hot",
      "nextFollowUpAt": "2026-05-30T10:00:00.000Z",
      "closureReason": null,
      "closureNotes": null
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 },
  "message": "Leads fetched successfully"
}
```

### Get Lead Details
- **Method**: `GET`
- **URL**: `/organizations/:orgId/leads/:id`
- **Auth**: Bearer Token (Superadmin, Org Admin, Lead Manager)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Path Params**:
  - `orgId` (uuid): Organization ID
  - `id` (uuid): Lead ID
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "branchId": "uuid",
    "status": "verified",
    "verifiedBy": "uuid",
    "verifiedAt": "2026-05-28T03:40:00.000Z",
    "assignedTo": "uuid",
    "score": 74,
    "scoreBand": "hot",
    "nextFollowUpAt": "2026-05-30T10:00:00.000Z",
    "closureReason": null,
    "closureNotes": null
  },
  "message": "Lead details fetched successfully"
}
```

### Update Lead Status (Basic)
- **Description**: Lightweight status update endpoint used by existing UI integrations.
- **Method**: `PATCH`
- **URL**: `/organizations/:orgId/leads/:id/status`
- **Auth**: Bearer Token (Superadmin, Org Admin, Lead Manager)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Path Params**:
  - `orgId` (uuid): Organization ID
  - `id` (uuid): Lead ID
- **Request Example**:
```json
{
  "status": "verified"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "verified"
  },
  "message": "Lead status updated successfully"
}
```

### Verify Lead
- **Description**: Qualify or disqualify an unverified lead and stamp verifier metadata.
- **Method**: `PATCH`
- **URL**: `/organizations/:orgId/leads/:id/verify`
- **Auth**: Bearer Token (Superadmin, Org Admin, Lead Manager)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Path Params**:
  - `orgId` (uuid): Organization ID
  - `id` (uuid): Lead ID
- **Request Example**:
```json
{
  "action": "qualify",
  "reason": "Valid contact and genuine admission intent"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "verified",
    "verifiedBy": "uuid",
    "verifiedAt": "2026-05-28T03:41:00.000Z"
  },
  "message": "Lead verified successfully"
}
```

### Reassign Lead
- **Description**: Reassign a lead to another active counselor in the same organization.
- **Method**: `PATCH`
- **URL**: `/organizations/:orgId/leads/:id/assign`
- **Auth**: Bearer Token (Superadmin, Org Admin, Lead Manager)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Path Params**:
  - `orgId` (uuid): Organization ID
  - `id` (uuid): Lead ID
- **Request Example**:
```json
{
  "assignedTo": "counselor-uuid",
  "reason": "Reassigned based on region specialization"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "assignedTo": "counselor-uuid",
    "assignedAt": "2026-05-28T03:43:00.000Z"
  },
  "message": "Lead assigned successfully"
}
```

### Add Lead Note
- **Description**: Add counselor/manager notes, disposition, and optional next follow-up date.
- **Method**: `POST`
- **URL**: `/organizations/:orgId/leads/:id/notes`
- **Auth**: Bearer Token (Superadmin, Org Admin, Lead Manager, Counselor)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Path Params**:
  - `orgId` (uuid): Organization ID
  - `id` (uuid): Lead ID
- **Request Example**:
```json
{
  "content": "Called student, interested in B.Tech CS. Requested callback on Saturday.",
  "disposition": "contacted_not_ready",
  "nextFollowUpAt": "2026-05-30T10:00:00.000Z"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "working",
    "nextFollowUpAt": "2026-05-30T10:00:00.000Z"
  },
  "message": "Lead note added successfully"
}
```

### Update Workflow Status
- **Description**: Update workflow status for lifecycle transitions such as working/converted/reopened.
- **Method**: `PATCH`
- **URL**: `/organizations/:orgId/leads/:id/workflow-status`
- **Auth**: Bearer Token (Superadmin, Org Admin, Lead Manager, Counselor)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Path Params**:
  - `orgId` (uuid): Organization ID
  - `id` (uuid): Lead ID
- **Request Example**:
```json
{
  "status": "working",
  "reason": "Counseling conversation started"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "working"
  },
  "message": "Lead workflow status updated successfully"
}
```

### Close Lead
- **Description**: Close a lead with mandatory closure reason and optional notes.
- **Method**: `PATCH`
- **URL**: `/organizations/:orgId/leads/:id/close`
- **Auth**: Bearer Token (Superadmin, Org Admin, Lead Manager, Counselor)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Path Params**:
  - `orgId` (uuid): Organization ID
  - `id` (uuid): Lead ID
- **Request Example**:
```json
{
  "reason": "not_interested",
  "notes": "Student confirmed they are not pursuing this cycle."
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "closed",
    "closureReason": "not_interested",
    "closureNotes": "Student confirmed they are not pursuing this cycle."
  },
  "message": "Lead closed successfully"
}
```

### Delete Lead
- **Method**: `DELETE`
- **URL**: `/organizations/:orgId/leads/:id`
- **Auth**: Bearer Token (Superadmin, Org Admin)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Path Params**:
  - `orgId` (uuid): Organization ID
  - `id` (uuid): Lead ID
- **Response**:
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

---

## 8. Form Responses (Admin)

### List Responses for a Form (Paginated)
- **Method**: `GET`
- **URL**: `/organizations/:orgId/forms/:id/responses?page=1&limit=10&status=pending`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Response**:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "data": { "name": "John Doe", ... }, "status": "pending", "isDuplicate": false, ... }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 },
  "message": "Form responses fetched successfully"
}
```

### Update Response Status
- **Method**: `PATCH`
- **URL**: `/responses/:id`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Request Example**:
```json
{
  "status": "verified"
}
```
- **Response**:
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "verified", ... },
  "message": "Response status updated successfully"
}
```

## 1. Authentication

### Register Superadmin
*One-time bootstrap endpoint to create the platform owner.*
- **Method**: `POST`
- **URL**: `/auth/register-superadmin`
- **Auth**: None
- **Rate Limit**: 3 requests / minute
- **Request Example**:
```json
{
  "name": "Super Admin",
  "email": "admin@admission.com",
  "password": "strongpassword123"
}
```
- **Response**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Super Admin", "email": "admin@admission.com", "role": "superadmin" },
  "message": "Superadmin registered successfully"
}
```

### Login
*Returns a JWT token and user profile. Automatically checks organization status.*
- **Method**: `POST`
- **URL**: `/auth/login`
- **Auth**: None
- **Rate Limit**: 5 requests / minute
- **Request Example**:
```json
{
  "email": "admin@admission.com",
  "password": "strongpassword123"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbG...",
    "user": { "id": "uuid", "name": "Super Admin", "email": "admin@admission.com", "role": "superadmin" }
  },
  "message": "Login successful"
}
```

---

## 2. Organizations

### Create Organization
- **Method**: `POST`
- **URL**: `/organizations`
- **Auth**: Bearer Token (Superadmin)
- **Request Example**:
```json
{
  "name": "Institute of Technology",
  "slug": "iot-main",
  "email": "contact@iot.edu",
  "phone": "9876543210",
  "address": "123 Campus Road",
  "subscriptionStart": "2024-01-01T00:00:00Z",
  "subscriptionEnd": "2025-01-01T00:00:00Z"
}
```
- **Response**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Institute of Technology", "createdBy": "uuid", ... },
  "message": "Organization created successfully"
}
```

### List All Organizations (Paginated)
- **Method**: `GET`
- **URL**: `/organizations?page=1&limit=10`
- **Auth**: Bearer Token (Superadmin)
- **Query Params**:
  - `page`: default 1
  - `limit`: default 10 (max 100)
- **Response**:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Institute 1", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  },
  "message": "Organizations fetched successfully"
}
```

### Get Organization Details
- **Method**: `GET`
- **URL**: `/organizations/:id`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Enforcement**: Org Admin can only fetch their own organization (`:id` must match their `organizationId`).
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Institute of Technology",
    "slug": "iot-main",
    "email": "contact@iot.edu",
    "phone": "9876543210",
    "address": "123 Campus Road",
    "logoUrl": null,
    "status": "active",
    "subscriptionStart": "2024-01-01T00:00:00.000Z",
    "subscriptionEnd": "2025-01-01T00:00:00.000Z",
    "branches": [...]
  },
  "message": "Organization details fetched successfully"
}
```

### Update Organization (Edit)
- **Method**: `PATCH`
- **URL**: `/organizations/:id`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Enforcement**:
  - Org Admin can only edit **their own** organization (`:id` must match their `organizationId`).
  - Org Admin is restricted from editing: `status`, `slug`, `subscriptionStart`, `subscriptionEnd`. These fields are silently ignored if sent by an Org Admin.
  - Superadmin can edit all fields.
- **Request Example (Superadmin — all fields)**:
```json
{
  "name": "Updated Institute Name",
  "slug": "updated-slug",
  "email": "new@iot.edu",
  "phone": "9876543210",
  "address": "456 New Campus Road",
  "logoUrl": "https://cdn.example.com/logo.png",
  "status": "suspended",
  "subscriptionStart": "2024-06-01T00:00:00Z",
  "subscriptionEnd": "2025-06-01T00:00:00Z"
}
```
- **Request Example (Org Admin — profile fields only)**:
```json
{
  "name": "Updated Institute Name",
  "email": "new@iot.edu",
  "phone": "9876543210",
  "address": "456 New Campus Road",
  "logoUrl": "https://cdn.example.com/logo.png"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Institute Name",
    "email": "new@iot.edu",
    "phone": "9876543210",
    "address": "456 New Campus Road",
    "logoUrl": "https://cdn.example.com/logo.png",
    "status": "active",
    "slug": "iot-main",
    "updatedBy": "uuid"
  },
  "message": "Organization updated successfully"
}
```

---

## 3. Branches

### Create Branch
- **Method**: `POST`
- **URL**: `/organizations/:orgId/branches`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Enforcement**: TenantGuard ensures `:orgId` matches token.
- **Request Example**:
```json
{
  "name": "North Campus",
  "code": "NC-01",
  "address": "Sector 5, North City",
  "city": "Delhi",
  "state": "Delhi"
}
```
- **Response**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "North Campus", "createdBy": "uuid", ... },
  "message": "Branch created successfully"
}
```

### List Branches of an Organization (Paginated)
- **Method**: `GET`
- **URL**: `/organizations/:orgId/branches?page=1&limit=10`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Enforcement**: TenantGuard ensures `:orgId` matches token.
- **Response**:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 },
  "message": "Branches fetched successfully"
}
```

---

## 4. Users (Staff Management)

### Create Staff User
- **Method**: `POST`
- **URL**: `/organizations/:orgId/users`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Enforcement**: 
  - TenantGuard ensures `:orgId` matches token.
  - Org Admin cannot create Superadmin or other Org Admins.
- **Request Example**:
```json
{
  "name": "Jane Doe",
  "email": "jane@iot.edu",
  "password": "staffpassword123",
  "role": "counselor",
  "phone": "9988776655",
  "branchId": "uuid-optional"
}
```
- **Response**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Jane Doe", "tokenVersion": 0, "createdBy": "uuid", ... },
  "message": "Staff user created successfully"
}
```

### Update Staff User
- **Method**: `PATCH`
- **URL**: `/organizations/:orgId/users/:id`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Enforcement**:
  - User cannot change their own role.
  - Only Superadmin can promote to Org Admin.
  - Role change/Deactivation increments `tokenVersion` (Invalidates session).
- **Request Example**:
```json
{
  "role": "lead_manager",
  "isActive": false
}
```
- **Response**:
```json
{
  "success": true,
  "data": { ... },
  "message": "User updated successfully"
}
```

### List Organization Users (Paginated)
- **Method**: `GET`
- **URL**: `/organizations/:orgId/users?page=1&limit=10`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Response**:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 10, "total": 12, "totalPages": 2 },
  "message": "Staff users fetched successfully"
}
```
