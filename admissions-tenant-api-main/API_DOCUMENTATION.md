# Admission System — API Documentation

This document lists all available API endpoints. 

**Base URL**: `http://localhost:3000/api`

---

## Standard Response Structure (All Success Responses)

All successful API responses return an HTTP `200`, `201`, or `204` status code and adhere to the following JSON structure:

```json
{
  "success": true,
  "data": { ... } or [ ... ] or null,
  "message": "Dynamic message describing the outcome",
  "pagination": { ... } // Only included for paginated list (GET) requests
}
```

### Pagination Object Detail
```json
{
  "page": 1,
  "limit": 10,
  "total": 45,
  "totalPages": 5
}
```

---

## Standard Error Response Structure

All failed requests return an appropriate HTTP status code (`400`, `401`, `403`, `404`, `422`, `500`) and adhere to the following structure:

```json
{
  "success": false,
  "message": "Human-readable error message describing what went wrong",
  "errors": { "field": "error detail" }, // Only present for 400/422 DTO validation errors
  "timestamp": "2026-06-02T12:20:14.000Z"
}
```

---

## Role-Based Access Control (RBAC) Matrix

| Module | API Endpoint | Superadmin | Org Admin | Lead Manager | Counselor | Public |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Auth** | `POST /api/auth/register-superadmin` | ✅ (Bootstrap) | ❌ | ❌ | ❌ | ❌ |
| **Auth** | `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Orgs** | `POST /api/organizations` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Orgs** | `GET /api/organizations` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Orgs** | `GET /api/organizations/:id` | ✅ | ✅ (Own) | ❌ | ❌ | ❌ |
| **Orgs** | `PATCH /api/organizations/:id` | ✅ (All fields) | ✅ (Profile only) | ❌ | ❌ | ❌ |
| **Orgs** | `DELETE /api/organizations/:id` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Branches** | `POST /api/organizations/:orgId/branches` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Branches** | `GET /api/organizations/:orgId/branches` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Branches** | `GET /api/organizations/:orgId/branches/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Branches** | `PATCH /api/organizations/:orgId/branches/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Branches** | `DELETE /api/organizations/:orgId/branches/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Users** | `GET /api/users/me` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Users** | `POST /api/organizations/:orgId/users` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Users** | `GET /api/organizations/:orgId/users` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Users** | `PATCH /api/organizations/:orgId/users/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Users** | `DELETE /api/organizations/:orgId/users/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Forms** | `POST /api/organizations/:orgId/forms` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Forms** | `GET /api/organizations/:orgId/forms` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Forms** | `GET /api/organizations/:orgId/forms/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Forms** | `PATCH /api/organizations/:orgId/forms/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Forms** | `DELETE /api/organizations/:orgId/forms/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Forms** | `POST /api/organizations/:orgId/forms/:id/duplicate` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Templates**| `GET /api/form-templates` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Public** | `GET /api/public/forms/:slug` | Public | Public | Public | Public | Public |
| **Ingestion**| `POST /api/public/forms/:slug/submit` | Public | Public | Public | Public | Public |
| **Leads** | `GET /api/organizations/:orgId/leads` | ✅ | ✅ | ✅ | ✅ (Own/Assigned) | ❌ |
| **Leads** | `GET /api/organizations/:orgId/leads/:id` | ✅ | ✅ | ✅ | ✅ (Own/Assigned) | ❌ |
| **Leads** | `PATCH /api/organizations/:orgId/leads/:id/status` | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Leads** | `PATCH /api/organizations/:orgId/leads/:id/verify` | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Leads** | `PATCH /api/organizations/:orgId/leads/:id/assign` | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Leads** | `POST /api/organizations/:orgId/leads/:id/notes` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Leads** | `PATCH /api/organizations/:orgId/leads/:id/workflow-status` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Leads** | `PATCH /api/organizations/:orgId/leads/:id/close` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Leads** | `DELETE /api/organizations/:orgId/leads/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Responses**| `GET /api/organizations/:orgId/forms/:id/responses` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Responses**| `PATCH /api/responses/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **AcademicSessions**| `POST /api/organizations/:orgId/academic-sessions` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **AcademicSessions**| `GET /api/organizations/:orgId/academic-sessions` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **AcademicSessions**| `GET /api/organizations/:orgId/academic-sessions/current` | Public | Public | Public | Public | Public |
| **AcademicSessions**| `GET /api/organizations/:orgId/academic-sessions/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **AcademicSessions**| `PATCH /api/organizations/:orgId/academic-sessions/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **AcademicSessions**| `DELETE /api/organizations/:orgId/academic-sessions/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Courses** | `POST /api/organizations/:orgId/courses` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Courses** | `GET /api/organizations/:orgId/courses` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Courses** | `GET /api/organizations/:orgId/courses/:id` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Courses** | `PATCH /api/organizations/:orgId/courses/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Courses** | `DELETE /api/organizations/:orgId/courses/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CourseSessions** | `POST /api/organizations/:orgId/course-sessions` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CourseSessions** | `GET /api/organizations/:orgId/course-sessions` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **CourseSessions** | `GET /api/organizations/:orgId/course-sessions/:id` | ✅ | ✅ | ✅ | ✅ | ❌ |
| **CourseSessions** | `PATCH /api/organizations/:orgId/course-sessions/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CourseSessions** | `DELETE /api/organizations/:orgId/course-sessions/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 1. Authentication

### Register Superadmin
*One-time bootstrap endpoint to create the platform owner.*
- **Method & URL**: `POST /api/auth/register-superadmin`
- **Headers**: `Content-Type: application/json`
- **Parameters**: None
- **Rate Limit**: 3 requests / minute
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
  "data": {
    "id": "c71b4839-01cc-445f-b7b1-f3e2210cdbd3",
    "name": "Super Admin",
    "email": "admin@admission.com",
    "role": "superadmin"
  },
  "message": "Superadmin registered successfully"
}
```

### Login
*Authenticate user credentials and return a JWT access token alongside user profile metadata. Checks if tenant organization is currently active.*
- **Method & URL**: `POST /api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Parameters**: None
- **Rate Limit**: 5 requests / minute
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
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "c71b4839-01cc-445f-b7b1-f3e2210cdbd3",
      "name": "Super Admin",
      "email": "admin@admission.com",
      "role": "superadmin"
    }
  },
  "message": "Login successful"
}
```

---

## 2. Organizations

### Create Organization
*Provision a new tenant organization with basic metadata and subscription duration details.*
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
  "logoUrl": "https://cdn.example.com/logo.png",
  "status": "active",
  "subscriptionStart": "2026-01-01T00:00:00Z",
  "subscriptionEnd": "2027-01-01T00:00:00Z"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d",
    "name": "Institute of Technology",
    "slug": "iot-main",
    "email": "contact@iot.edu",
    "phone": "9876543210",
    "address": "123 Campus Road",
    "logoUrl": "https://cdn.example.com/logo.png",
    "status": "active",
    "subscriptionStart": "2026-01-01T00:00:00.000Z",
    "subscriptionEnd": "2027-01-01T00:00:00.000Z",
    "createdBy": "c71b4839-01cc-445f-b7b1-f3e2210cdbd3"
  },
  "message": "Organization created successfully"
}
```

### List All Organizations (Paginated)
*List all registered organizations in the platform with metadata.*
- **Method & URL**: `GET /api/organizations`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Query: `page` (number, optional, default: 1)
  - Query: `limit` (number, optional, default: 10, max: 100)
- **Request Example**: None (Empty Body)
- **Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d",
      "name": "Institute of Technology",
      "slug": "iot-main",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "message": "Organizations fetched successfully"
}
```

### Get Organization Details
*Fetch detailed metadata for a single organization, including its list of branches.*
- **Method & URL**: `GET /api/organizations/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `id` (uuid, required)
- **Constraint**: Org Admin can only request details of their own organization (where `:id` matches their own `organizationId`).
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d",
    "name": "Institute of Technology",
    "slug": "iot-main",
    "email": "contact@iot.edu",
    "phone": "9876543210",
    "address": "123 Campus Road",
    "logoUrl": "https://cdn.example.com/logo.png",
    "status": "active",
    "subscriptionStart": "2026-01-01T00:00:00.000Z",
    "subscriptionEnd": "2027-01-01T00:00:00.000Z",
    "branches": []
  },
  "message": "Organization details fetched successfully"
}
```

### Update Organization
*Update organization profile configurations. Field updates are restricted based on permissions.*
- **Method & URL**: `PATCH /api/organizations/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `id` (uuid, required)
- **Constraint**:
  - Org Admin can only edit **their own** organization.
  - Org Admin is restricted from editing: `status`, `slug`, `subscriptionStart`, `subscriptionEnd` (these fields are silently ignored).
  - Superadmin can modify all fields.
- **Request Example**:
```json
{
  "name": "Updated Institute of Technology",
  "email": "contact-new@iot.edu",
  "phone": "9876543211",
  "address": "456 New Campus Road"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d",
    "name": "Updated Institute of Technology",
    "email": "contact-new@iot.edu",
    "phone": "9876543211",
    "address": "456 New Campus Road",
    "logoUrl": "https://cdn.example.com/logo.png",
    "status": "active",
    "slug": "iot-main",
    "updatedBy": "c71b4839-01cc-445f-b7b1-f3e2210cdbd3"
  },
  "message": "Organization updated successfully"
}
```

### Delete Organization
*Permanently delete an organization and all cascading dependencies.*
- **Method & URL**: `DELETE /api/organizations/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": null,
  "message": "Organization deleted successfully"
}
```

---

## 3. Branches

### Create Branch
*Create a new branch under an organization.*
- **Method & URL**: `POST /api/organizations/:orgId/branches`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
- **Request Example**:
```json
{
  "name": "North Campus",
  "code": "NC-01",
  "address": "Sector 5, North City",
  "city": "Delhi",
  "state": "Delhi",
  "isActive": true
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "a90a2a1a-cb32-411a-8cfa-555e7188f11d",
    "name": "North Campus",
    "code": "NC-01",
    "address": "Sector 5, North City",
    "city": "Delhi",
    "state": "Delhi",
    "isActive": true,
    "organizationId": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d",
    "createdBy": "c71b4839-01cc-445f-b7b1-f3e2210cdbd3"
  },
  "message": "Branch created successfully"
}
```

### List Branches of an Organization (Paginated)
*Retrieve a paginated list of branches belonging to the organization.*
- **Method & URL**: `GET /api/organizations/:orgId/branches`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Query: `page` (number, optional, default: 1)
  - Query: `limit` (number, optional, default: 10)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "a90a2a1a-cb32-411a-8cfa-555e7188f11d",
      "name": "North Campus",
      "code": "NC-01",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "message": "Branches fetched successfully"
}
```

### Get Branch Details
*Retrieve specific configurations and details for a single branch.*
- **Method & URL**: `GET /api/organizations/:orgId/branches/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "a90a2a1a-cb32-411a-8cfa-555e7188f11d",
    "name": "North Campus",
    "code": "NC-01",
    "address": "Sector 5, North City",
    "city": "Delhi",
    "state": "Delhi",
    "isActive": true,
    "organizationId": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d"
  },
  "message": "Branch details fetched successfully"
}
```

### Update Branch
*Modify metadata fields of an existing branch.*
- **Method & URL**: `PATCH /api/organizations/:orgId/branches/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**:
```json
{
  "name": "North Campus Main",
  "code": "NCM-01",
  "isActive": false
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "a90a2a1a-cb32-411a-8cfa-555e7188f11d",
    "name": "North Campus Main",
    "code": "NCM-01",
    "address": "Sector 5, North City",
    "city": "Delhi",
    "state": "Delhi",
    "isActive": false,
    "organizationId": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d",
    "updatedBy": "c71b4839-01cc-445f-b7b1-f3e2210cdbd3"
  },
  "message": "Branch updated successfully"
}
```

### Delete Branch
*Permanently delete a branch from the organization.*
- **Method & URL**: `DELETE /api/organizations/:orgId/branches/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": null,
  "message": "Branch deleted successfully"
}
```

---

## 4. Users (Staff Management)

### Get Current User Profile (`/users/me`)
*Fetch the profile and metadata details of the currently logged-in user.*
- **Method & URL**: `GET /api/users/me`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: None
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "90e66164-9cb3-4886-81cf-4d929424c56e",
    "name": "Jane Doe",
    "email": "jane@iot.edu",
    "role": "org_admin",
    "organizationId": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d"
  },
  "message": "Profile fetched successfully"
}
```

### Create Staff User
*Create a new staff user profile under the specified organization.*
- **Method & URL**: `POST /api/organizations/:orgId/users`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
- **Constraint**: Org Admins cannot create Superadmins or other Org Admins.
- **Request Example**:
```json
{
  "name": "John Counselor",
  "email": "john.c@iot.edu",
  "password": "staffpassword123",
  "role": "counselor",
  "phone": "9988776655",
  "branchId": "a90a2a1a-cb32-411a-8cfa-555e7188f11d"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "f51a2f1c-32ee-41bb-a5a5-c72465137ba8",
    "name": "John Counselor",
    "email": "john.c@iot.edu",
    "role": "counselor",
    "phone": "9988776655",
    "branchId": "a90a2a1a-cb32-411a-8cfa-555e7188f11d",
    "organizationId": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d",
    "tokenVersion": 0,
    "createdBy": "90e66164-9cb3-4886-81cf-4d929424c56e"
  },
  "message": "Staff user created successfully"
}
```

### List Organization Users (Paginated)
*Retrieve list of all staff members belonging to the organization.*
- **Method & URL**: `GET /api/organizations/:orgId/users`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Query: `page` (number, optional, default: 1)
  - Query: `limit` (number, optional, default: 10)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "f51a2f1c-32ee-41bb-a5a5-c72465137ba8",
      "name": "John Counselor",
      "email": "john.c@iot.edu",
      "role": "counselor",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "message": "Staff users fetched successfully"
}
```

### Update Staff User
*Update details, roles, or deactivation status of a staff member.*
- **Method & URL**: `PATCH /api/organizations/:orgId/users/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Constraints**:
  - A user cannot modify their own role.
  - Only Superadmins can promote a user to `org_admin`.
  - Changing a user's role or deactivating them automatically increments their `tokenVersion` (invalidates all active sessions).
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
  "data": {
    "id": "f51a2f1c-32ee-41bb-a5a5-c72465137ba8",
    "role": "lead_manager",
    "isActive": false,
    "tokenVersion": 1
  },
  "message": "User updated successfully"
}
```

### Delete Staff User
*Permanently delete a staff user record.*
- **Method & URL**: `DELETE /api/organizations/:orgId/users/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": null,
  "message": "User deleted successfully"
}
```

---

## 5. Forms (Lead Capture Configuration)

### Create Form
*Create a new lead capture form for a campaign.*
- **Method & URL**: `POST /api/organizations/:orgId/forms`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
- **Request Example**:
```json
{
  "name": "UG Admission 2026",
  "slug": "ug-admission-2026",
  "campaignId": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "b18a28f4-3cb1-447e-855f-c967aa5ef21e",
    "name": "UG Admission 2026",
    "slug": "ug-admission-2026",
    "status": "draft",
    "createdBy": "90e66164-9cb3-4886-81cf-4d929424c56e"
  },
  "message": "Form created successfully"
}
```

### List Forms (Paginated)
*Retrieve list of forms, optionally filtered by status or name search query.*
- **Method & URL**: `GET /api/organizations/:orgId/forms`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Query: `page` (number, optional, default: 1)
  - Query: `limit` (number, optional, default: 10)
  - Query: `search` (string, optional) — matches form name
  - Query: `status` (string, optional) — `draft | active | paused`
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "b18a28f4-3cb1-447e-855f-c967aa5ef21e",
      "name": "UG Admission 2026",
      "slug": "ug-admission-2026",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "message": "Forms fetched successfully"
}
```

### Get Single Form Details
*Fetch full configurations and input schemas/fields of a form.*
- **Method & URL**: `GET /api/organizations/:orgId/forms/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "b18a28f4-3cb1-447e-855f-c967aa5ef21e",
    "name": "UG Admission 2026",
    "slug": "ug-admission-2026",
    "status": "active",
    "fields": [
      { "id": "fullname", "label": "Full Name", "type": "text", "required": true },
      { "id": "email", "label": "Email Address", "type": "email", "required": true }
    ],
    "organizationId": "e81d77b4-01fa-4f9e-be48-93e18a9ef31d"
  },
  "message": "Form details fetched successfully"
}
```

### Update Form (Fields / Status)
*Modify form schemas, status transitions, slugs, or field attributes.*
- **Method & URL**: `PATCH /api/organizations/:orgId/forms/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**:
```json
{
  "name": "Updated UG Admission 2026",
  "fields": [
    { "id": "fullname", "label": "Full Name", "type": "text", "required": true },
    { "id": "email", "label": "Email Address", "type": "email", "required": true },
    { "id": "phone", "label": "Phone Number", "type": "tel", "required": false }
  ],
  "status": "active"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "b18a28f4-3cb1-447e-855f-c967aa5ef21e",
    "name": "Updated UG Admission 2026",
    "status": "active",
    "fields": [
      { "id": "fullname", "label": "Full Name", "type": "text", "required": true },
      { "id": "email", "label": "Email Address", "type": "email", "required": true },
      { "id": "phone", "label": "Phone Number", "type": "tel", "required": false }
    ]
  },
  "message": "Form updated successfully"
}
```

### Delete Form
*Remove form record from organization schema.*
- **Method & URL**: `DELETE /api/organizations/:orgId/forms/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": null,
  "message": "Form deleted successfully"
}
```

### Duplicate Form
*Duplicate an existing form schema as a draft copy.*
- **Method & URL**: `POST /api/organizations/:orgId/forms/:id/duplicate`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "c82b99f5-4dc2-558f-966f-d178bb6fa32f",
    "name": "Updated UG Admission 2026 (Copy)",
    "status": "draft",
    "fields": [
      { "id": "fullname", "label": "Full Name", "type": "text", "required": true }
    ]
  },
  "message": "Form duplicated successfully"
}
```

---

## 6. Form Templates

### List All Templates
*List read-only, pre-configured form templates available for rapid bootstrapping.*
- **Method & URL**: `GET /api/form-templates`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: None
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "t1-template-uuid",
      "name": "Standard Admission Template",
      "fields": [
        { "id": "fullname", "label": "Full Name", "type": "text", "required": true },
        { "id": "email", "label": "Email", "type": "email", "required": true },
        { "id": "phone", "label": "Phone", "type": "tel", "required": true }
      ]
    }
  ],
  "message": "Form templates fetched successfully"
}
```

---

## 7. Public Form Handling & Ingestion

### Get Form Configuration (Public)
*Fetch active form configurations and field requirements without authentication by form slug.*
- **Method & URL**: `GET /api/public/forms/:slug`
- **Headers**: None
- **Parameters**:
  - Path: `slug` (string, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "b18a28f4-3cb1-447e-855f-c967aa5ef21e",
    "name": "UG Admission 2026",
    "slug": "ug-admission-2026",
    "fields": [
      { "id": "fullname", "label": "Full Name", "type": "text", "required": true },
      { "id": "email", "label": "Email Address", "type": "email", "required": true }
    ]
  },
  "message": "Form configuration fetched successfully"
}
```

### Submit Public Form (Lead Ingestion)
*Accept submission input from public lead forms, perform validations, track UTM metadata, and register leads.*
- **Method & URL**: `POST /api/public/forms/:slug/submit`
- **Headers**: `Content-Type: application/json`
- **Parameters**:
  - Path: `slug` (string, required)
- **Request Example**:
```json
{
  "data": {
    "fullname": "John Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210"
  },
  "utmData": {
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "fall_ad_2026"
  },
  "source": "fb_ad"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "success": true
  },
  "message": "Form submitted successfully"
}
```

---

## 8. Leads Management

### List Leads (Paginated)
*Retrieve list of captured campaign leads filtered by queries. Counselors can only query leads assigned to them.*
- **Method & URL**: `GET /api/organizations/:orgId/leads`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Query: `page` (number, optional, default: 1)
  - Query: `limit` (number, optional, default: 10)
  - Query: `search` (string, optional) — matches first/last name or email
  - Query: `status` (string, optional) — `unverified | verified | disqualified | working | converted | closed`
  - Query: `assignedTo` (string, optional) — Counselor UUID or the literal `me`
  - Query: `followUpDate` (string, optional) — `YYYY-MM-DD`
  - Query: `scoreBand` (string, optional) — `hot | warm | cold`
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "e92d88a2-2ba2-4ccb-be55-c891ff6d21ea",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "9876543210",
      "status": "verified",
      "assignedTo": "f51a2f1c-32ee-41bb-a5a5-c72465137ba8",
      "verifiedBy": "90e66164-9cb3-4886-81cf-4d929424c56e",
      "verifiedAt": "2026-06-02T03:40:00.000Z",
      "score": 75,
      "scoreBand": "hot",
      "nextFollowUpAt": "2026-06-05T10:00:00.000Z",
      "closureReason": null,
      "closureNotes": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "message": "Leads fetched successfully"
}
```

### Get Lead Details
*Fetch all detailed fields, disposition, follow-ups, and closure reasons for a lead.*
- **Method & URL**: `GET /api/organizations/:orgId/leads/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "e92d88a2-2ba2-4ccb-be55-c891ff6d21ea",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "status": "verified",
    "branchId": "a90a2a1a-cb32-411a-8cfa-555e7188f11d",
    "verifiedBy": "90e66164-9cb3-4886-81cf-4d929424c56e",
    "verifiedAt": "2026-06-02T03:40:00.000Z",
    "assignedTo": "f51a2f1c-32ee-41bb-a5a5-c72465137ba8",
    "score": 75,
    "scoreBand": "hot",
    "nextFollowUpAt": "2026-06-05T10:00:00.000Z",
    "closureReason": null,
    "closureNotes": null
  },
  "message": "Lead details fetched successfully"
}
```

### Update Lead Status (Basic)
*Lightweight status field updates used by legacy/third-party integrations.*
- **Method & URL**: `PATCH /api/organizations/:orgId/leads/:id/status`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
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
    "id": "e92d88a2-2ba2-4ccb-be55-c891ff6d21ea",
    "status": "verified"
  },
  "message": "Lead status updated successfully"
}
```

### Verify Lead
*Qualify or disqualify a raw, unverified lead and stamp verifier metadata. Optionally link duplicates.*
- **Method & URL**: `PATCH /api/organizations/:orgId/leads/:id/verify`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Validation**:
  - `action` must be `qualify` or `disqualify`.
  - `reason` is **mandatory** if action is `disqualify`.
  - `duplicateOfLeadId` (optional uuid) can be supplied to flag a duplicated profile.
- **Request Example (Disqualify Duplicate)**:
```json
{
  "action": "disqualify",
  "reason": "Found duplicate profile on mobile search",
  "duplicateOfLeadId": "a10b1a2b-cd34-4a56-bef7-1901dd1a11ff"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "e92d88a2-2ba2-4ccb-be55-c891ff6d21ea",
    "status": "disqualified",
    "verifiedBy": "90e66164-9cb3-4886-81cf-4d929424c56e",
    "verifiedAt": "2026-06-02T03:41:00.000Z"
  },
  "message": "Lead verified successfully"
}
```

### Reassign Lead
*Assign or reassign a lead to another active counselor within the same organization.*
- **Method & URL**: `PATCH /api/organizations/:orgId/leads/:id/assign`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**:
```json
{
  "assignedTo": "f51a2f1c-32ee-41bb-a5a5-c72465137ba8",
  "reason": "Reassigned based on North region assignment rules"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "e92d88a2-2ba2-4ccb-be55-c891ff6d21ea",
    "assignedTo": "f51a2f1c-32ee-41bb-a5a5-c72465137ba8",
    "assignedAt": "2026-06-02T03:43:00.000Z"
  },
  "message": "Lead assigned successfully"
}
```

### Add Lead Note
*Add contact notes, disposition codes, and set next schedule follow-ups.*
- **Method & URL**: `POST /api/organizations/:orgId/leads/:id/notes`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**:
```json
{
  "content": "Contacted candidate; extremely interested in CS branch but requests follow-up next Friday after board results.",
  "disposition": "contacted_not_ready",
  "nextFollowUpAt": "2026-06-09T10:00:00.000Z"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "e92d88a2-2ba2-4ccb-be55-c891ff6d21ea",
    "status": "working",
    "nextFollowUpAt": "2026-06-09T10:00:00.000Z"
  },
  "message": "Lead note added successfully"
}
```

### Update Workflow Status
*Update workflow lifecycle transitions like moving status to working/converted/reopened.*
- **Method & URL**: `PATCH /api/organizations/:orgId/leads/:id/workflow-status`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**:
```json
{
  "status": "working",
  "reason": "Counseling session completed, registration link shared"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "e92d88a2-2ba2-4ccb-be55-c891ff6d21ea",
    "status": "working"
  },
  "message": "Lead workflow status updated successfully"
}
```

### Close Lead
*Deactivate, archive, or close a lead with mandatory closure categorization and details.*
- **Method & URL**: `PATCH /api/organizations/:orgId/leads/:id/close`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**:
```json
{
  "reason": "not_interested",
  "notes": "Candidate joined another college."
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "e92d88a2-2ba2-4ccb-be55-c891ff6d21ea",
    "status": "closed",
    "closureReason": "not_interested",
    "closureNotes": "Candidate joined another college."
  },
  "message": "Lead closed successfully"
}
```

### Delete Lead
*Permanently delete a lead record from the tenant store.*
- **Method & URL**: `DELETE /api/organizations/:orgId/leads/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": null,
  "message": "Lead deleted successfully"
}
```

---

## 9. Form Responses

### List Responses for a Form (Paginated)
*Retrieve list of all lead capture submissions received for a specific form.*
- **Method & URL**: `GET /api/organizations/:orgId/forms/:id/responses`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required) — Form ID
  - Query: `page` (number, optional, default: 1)
  - Query: `limit` (number, optional, default: 10)
  - Query: `status` (string, optional) — `pending | verified | duplicate | spam`
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "r72b99f5-4dc2-558f-966f-d178bb6fa32f",
      "data": {
        "fullname": "John Doe",
        "email": "john.doe@example.com",
        "phone": "9876543210"
      },
      "status": "pending",
      "isDuplicate": false,
      "submittedAt": "2026-06-02T12:20:14.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "message": "Form responses fetched successfully"
}
```

### Update Response Status
*Manually update or moderate the ingestion status of a form submission.*
- **Method & URL**: `PATCH /api/responses/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `id` (uuid, required) — Response ID
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
    "id": "r72b99f5-4dc2-558f-966f-d178bb6fa32f",
    "status": "verified"
  },
  "message": "Response status updated successfully"
}
```

---

## 7. Applications

### Create Application
*Create a new application for a student, optionally linked to a lead.*
- **Method & URL**: `POST /api/applications`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**: None
- **Request Example**:
```json
{
  "leadId": "uuid-optional",
  "appliedFor": "B.Tech",
  "program": "Computer Science",
  "courseId": "course-uuid",
  "academicSession": "2026-2027",
  "applicant": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "9876543210"
  },
  "preferences": {
    "preference1": "branch-uuid-1",
    "preference2": "branch-uuid-2"
  }
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "applicationNo": "APP/2026/1001",
    "formStatus": "incomplete",
    "paymentStatus": "pending"
  },
  "message": "Application created successfully"
}
```

### List Applications (Paginated)
*Retrieve a paginated list of applications.*
- **Method & URL**: `GET /api/applications`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Query: `page` (number, optional, default: 1)
  - Query: `limit` (number, optional, default: 10)
  - Query: `search` (string, optional)
  - Query: `status` (string, optional)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "applicationNo": "APP/2026/1001",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "formStatus": "Incomplete",
      "paymentStatus": "pending"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "message": "Applications fetched successfully"
}
```

### Get Application Details
*Fetch detailed metadata for a single application including all child entities.*
- **Method & URL**: `GET /api/applications/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "applicationNo": "APP/2026/1001",
    "student": { "name": "Jane Doe" },
    "educationRecords": [],
    "entranceTests": []
  },
  "message": "Application details fetched successfully"
}
```

### Update Application Section
*Update specific sections of an application. The following endpoints follow the same pattern.*
- **Endpoints**:
  - `PATCH /api/applications/:applicationNo/personal`
  - `PATCH /api/applications/:applicationNo/preferences`
  - `PATCH /api/applications/:applicationNo/education`
  - `PATCH /api/applications/:applicationNo/entrance-tests`
  - `PATCH /api/applications/:applicationNo/parents`
  - `PATCH /api/applications/:applicationNo/addresses`
  - `PATCH /api/applications/:applicationNo/work-experience`
  - `PATCH /api/applications/:applicationNo/extra-curriculars`
  - `PATCH /api/applications/:applicationNo/other-qualifications`
  - `PATCH /api/applications/:applicationNo/additional-info`
  - `PATCH /api/applications/:applicationNo/declaration`
  - `PATCH /api/applications/:applicationNo/payment`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Constraints**: Cannot update if application is submitted, accepted, or rejected (except for `/payment`).
- **Request Example** (for `/education`):
```json
{
  "records": [
    {
      "level": "12th",
      "institution": "Delhi Public School",
      "boardUniversity": "CBSE",
      "yearOfPassing": "2025",
      "percentageCgpa": "95",
      "isCompleted": true
    }
  ]
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": true,
  "message": "Application updated successfully"
}
```

### Submit Application
*Locks the application from further edits and changes status to submitted.*
- **Method & URL**: `PATCH /api/applications/:applicationNo/submit`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: None
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "applicationNo": "APP/2026/1001",
    "formStatus": "submitted"
  },
  "message": "Application submitted successfully"
}
```

### Update Application Status
*Update the status of an application. Reserved for Managers/Admins.*
- **Method & URL**: `PATCH /api/applications/:applicationNo/status`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `applicationNo` (string, required)
- **Request Example**:
```json
{
  "status": "under_review"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "applicationNo": "APP/2026/1001",
    "formStatus": "under_review"
  },
  "message": "Application status updated successfully"
}
```

---

## 8. Master Tables

### Academic Sessions

#### Create Academic Session
*Create a new academic session.*
- **Method & URL**: `POST /api/organizations/:orgId/academic-sessions`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
- **Request Example**:
```json
{
  "name": "2025-26",
  "displayName": "Academic Year 2025-26",
  "startDate": "2025-07-01",
  "endDate": "2026-06-30",
  "isCurrent": false
}
```
- **Response Example**:
```json
{
    "success": true,
    "message": "Operation successful",
    "data": {
        "id": "cdf99cc7-6ad5-45fb-9ee6-d3309f78fb0c",
        "organizationId": "022cbe31-225a-4902-b33a-3a176498759a",
        "name": "2025-26",
        "displayName": "Academic Year 2025-26",
        "startDate": "2025-07-01",
        "endDate": "2026-06-30",
        "isCurrent": false,
        "isActive": true,
        "createdBy": "2ff1c660-473f-4576-b1db-a66a74e8ee26",
        "updatedBy": "2ff1c660-473f-4576-b1db-a66a74e8ee26",
        "createdAt": "2026-07-06T09:02:23.343Z",
        "updatedAt": "2026-07-06T09:02:23.343Z"
    }
}
```

#### List Academic Sessions
*List all academic sessions for an organization.*
- **Method & URL**: `GET /api/organizations/:orgId/academic-sessions`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "2025-26",
      "displayName": "Academic Year 2025-26",
      "isCurrent": true,
      "isActive": true
    }
  ],
  "message": "Academic sessions fetched successfully"
}
```

#### Get Current Academic Session
*Fetch the currently active academic session (Public API).*
- **Method & URL**: `GET /api/organizations/:orgId/academic-sessions/current`
- **Headers**: None
- **Parameters**:
  - Path: `orgId` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "2025-26",
    "displayName": "Academic Year 2025-26",
    "isCurrent": true,
    "isActive": true
  },
  "message": "Current academic session fetched successfully"
}
```

#### Get Single Academic Session
*Get details of a specific academic session.*
- **Method & URL**: `GET /api/organizations/:orgId/academic-sessions/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "2025-26",
    "displayName": "Academic Year 2025-26",
    "isCurrent": true,
    "isActive": true
  },
  "message": "Academic session details fetched successfully"
}
```

#### Update Academic Session
*Update an academic session (e.g., mark as current).*
- **Method & URL**: `PATCH /api/organizations/:orgId/academic-sessions/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**:
```json
{
  "isCurrent": true
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "2025-26",
    "isCurrent": true,
    "isActive": true
  },
  "message": "Academic session updated successfully"
}
```

#### Deactivate Academic Session
*Deactivate an academic session (soft delete).*
- **Method & URL**: `DELETE /api/organizations/:orgId/academic-sessions/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": null,
  "message": "Academic session deactivated successfully"
}
```

### Courses

#### Create Course
*Create a new course/program.*
- **Method & URL**: `POST /api/organizations/:orgId/courses`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
- **Request Example**:
```json
{
  "name": "B.Tech Computer Science",
  "code": "BTECH-CSE",
  "department": "Engineering",
  "duration": "4 Years",
  "durationMonths": 48
}
```
- **Response Example**:
```json
{
    "success": true,
    "message": "Operation successful",
    "data": {
        "id": "da14ee64-bdf8-43f1-b2f5-fb19bc88df82",
        "organizationId": "022cbe31-225a-4902-b33a-3a176498759a",
        "name": "B.Tech Computer Science",
        "code": "BTECH-CSE",
        "description": null,
        "department": "Engineering",
        "duration": "4 Years",
        "durationMonths": 48,
        "totalFee": null,
        "totalSeats": null,
        "isActive": true,
        "createdBy": "2ff1c660-473f-4576-b1db-a66a74e8ee26",
        "updatedBy": "2ff1c660-473f-4576-b1db-a66a74e8ee26",
        "createdAt": "2026-07-06T09:08:27.530Z",
        "updatedAt": "2026-07-06T09:08:27.530Z"
    }
}
```

#### List Courses
*List all courses (with optional filters: isActive, department, search).*
- **Method & URL**: `GET /api/organizations/:orgId/courses`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Query: `isActive` (boolean, optional)
  - Query: `department` (string, optional)
  - Query: `search` (string, optional)
- **Request Example**: None
- **Response Example**:
```json
{
    "success": true,
    "message": "Operation successful",
    "data": [
        {
            "id": "da14ee64-bdf8-43f1-b2f5-fb19bc88df82",
            "organizationId": "022cbe31-225a-4902-b33a-3a176498759a",
            "name": "B.Tech Computer Science",
            "code": "BTECH-CSE",
            "description": null,
            "department": "Engineering",
            "duration": "4 Years",
            "durationMonths": 48,
            "totalFee": null,
            "totalSeats": null,
            "isActive": true,
            "createdBy": "2ff1c660-473f-4576-b1db-a66a74e8ee26",
            "updatedBy": "2ff1c660-473f-4576-b1db-a66a74e8ee26",
            "createdAt": "2026-07-06T09:08:27.530Z",
            "updatedAt": "2026-07-06T09:08:27.530Z"
        },
        {
            "id": "cce812c4-022a-4667-9c18-d2bb90e76ae1",
            "organizationId": "022cbe31-225a-4902-b33a-3a176498759a",
            "name": "Computer Science",
            "code": "COMPUTER-SCIENCE",
            "description": null,
            "department": null,
            "duration": null,
            "durationMonths": null,
            "totalFee": null,
            "totalSeats": null,
            "isActive": true,
            "createdBy": null,
            "updatedBy": null,
            "createdAt": "2026-07-06T07:20:25.617Z",
            "updatedAt": "2026-07-06T07:20:25.617Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 2,
        "total": 2,
        "totalPages": 1
    }
}
```

#### Get Single Course
*Get details of a specific course.*
- **Method & URL**: `GET /api/organizations/:orgId/courses/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "B.Tech Computer Science",
    "code": "BTECH-CSE",
    "department": "Engineering",
    "isActive": true
  },
  "message": "Course details fetched successfully"
}
```

#### Update Course
*Update course metadata.*
- **Method & URL**: `PATCH /api/organizations/:orgId/courses/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**:
```json
{
  "department": "School of Engineering"
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "B.Tech Computer Science",
    "department": "School of Engineering",
    "isActive": true
  },
  "message": "Course updated successfully"
}
```

#### Deactivate Course
*Deactivate a course (soft delete).*
- **Method & URL**: `DELETE /api/organizations/:orgId/courses/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": null,
  "message": "Course deactivated successfully"
}
```

### Course Sessions

#### Create Course Session
*Link a course to an academic session.*
- **Method & URL**: `POST /api/organizations/:orgId/course-sessions`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
- **Request Example**:
```json
{
  "courseId": "course-uuid",
  "academicSessionId": "session-uuid",
  "totalSeats": 120,
  "feeAmount": 150000
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "courseId": "course-uuid",
    "academicSessionId": "session-uuid",
    "totalSeats": 120,
    "feeAmount": 150000,
    "isActive": true
  },
  "message": "Course session created successfully"
}
```

#### List Course Sessions
*List course sessions (with optional filters: courseId, academicSessionId, isActive).*
- **Method & URL**: `GET /api/organizations/:orgId/course-sessions`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Query: `courseId` (uuid, optional)
  - Query: `academicSessionId` (uuid, optional)
  - Query: `isActive` (boolean, optional)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "course": { "id": "course-uuid", "name": "B.Tech CSE" },
      "academicSession": { "id": "session-uuid", "name": "2025-26" },
      "totalSeats": 120,
      "feeAmount": 150000,
      "isActive": true
    }
  ],
  "message": "Course sessions fetched successfully"
}
```

#### Get Single Course Session
*Get details of a specific course session link.*
- **Method & URL**: `GET /api/organizations/:orgId/course-sessions/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "course": { "id": "course-uuid", "name": "B.Tech CSE" },
    "academicSession": { "id": "session-uuid", "name": "2025-26" },
    "totalSeats": 120,
    "feeAmount": 150000,
    "isActive": true
  },
  "message": "Course session details fetched successfully"
}
```

#### Update Course Session
*Update total seats or fees for a course session.*
- **Method & URL**: `PATCH /api/organizations/:orgId/course-sessions/:id`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**:
```json
{
  "feeAmount": 160000
}
```
- **Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "totalSeats": 120,
    "feeAmount": 160000,
    "isActive": true
  },
  "message": "Course session updated successfully"
}
```

#### Deactivate Course Session
*Deactivate a course session link.*
- **Method & URL**: `DELETE /api/organizations/:orgId/course-sessions/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**:
  - Path: `orgId` (uuid, required)
  - Path: `id` (uuid, required)
- **Request Example**: None
- **Response Example**:
```json
{
  "success": true,
  "data": null,
  "message": "Course session deactivated successfully"
}

```
