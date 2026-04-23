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
| **Leads** | `DELETE /api/organizations/:orgId/leads/:id` | ✅ | ✅ | ❌ |
| **Responses** | `GET /api/organizations/:orgId/forms/:id/responses` | ✅ | ✅ | ❌ |
| **Responses** | `PATCH /api/responses/:id` | ✅ | ✅ | ❌ |

---

## 5. Forms (Lead Capture)

### Create Form
- **Method**: `POST`
- **URL**: `/organizations/:orgId/forms`
- **Auth**: Bearer Token (Superadmin or Org Admin)
- **Body**:
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
- **Body**:
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
- **Body**:
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
- **URL**: `/organizations/:orgId/leads?page=1&limit=10&search=John`
- **Auth**: Bearer Token (Superadmin, Org Admin, Lead Manager)
- **Response**:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "firstName": "John", "lastName": "Doe", "email": "john@example.com", ... }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 },
  "message": "Leads fetched successfully"
}
```

### Get Lead Details
- **Method**: `GET`
- **URL**: `/organizations/:orgId/leads/:id`
- **Auth**: Bearer Token (Superadmin, Org Admin, Lead Manager)
- **Response**:
```json
{
  "success": true,
  "data": { "id": "uuid", "firstName": "John", ... },
  "message": "Lead details fetched successfully"
}
```

### Delete Lead
- **Method**: `DELETE`
- **URL**: `/organizations/:orgId/leads/:id`
- **Auth**: Bearer Token (Superadmin, Org Admin)
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
- **Body**:
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
- **Body**:
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
- **Body**:
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
- **Body**:
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
- **Body (Superadmin — all fields)**:
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
- **Body (Org Admin — profile fields only)**:
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
- **Body**:
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
- **Body**:
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
- **Body**:
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
