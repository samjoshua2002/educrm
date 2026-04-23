# Backend Instructions — Frontend Strategy Awareness
## What the Backend Team Must Know

**Date**: 2026-03-26

---

## 1. Frontend Cookie Expectations

The frontend stores the JWT `access_token` in a cookie named **`auth_token`**.

### Development Mode
- Cookie is set by the frontend via `js-cookie` (client-side JavaScript).
- Cookie is **NOT** HttpOnly in development so the frontend can decode it for display.

### Production Mode (Backend Must Handle)
- The backend should ideally set the cookie itself via `Set-Cookie` header on the login response.
- Cookie flags:
  - `HttpOnly: true`
  - `Secure: true`
  - `SameSite: Strict`
  - `Path: /`
  - `Max-Age: 86400` (1 day)
- When `HttpOnly` is `true`, the frontend CANNOT read the token. The frontend will call `GET /users/me` to get user data on app mount instead.

### Logout Endpoint (Future)
- Consider providing a `POST /auth/logout` endpoint that clears the `auth_token` cookie server-side (important when cookie is HttpOnly).

---

## 2. JWT Payload Contract

The frontend decodes the JWT (in development) to extract user context. The payload MUST contain:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "org_admin",
  "organizationId": "org-uuid-or-null"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `sub` | UUID string | User ID |
| `email` | string | User email |
| `role` | string | Must match one of the `Role` enum values exactly |
| `organizationId` | UUID string or `null` | `null` for superadmin, UUID for all org roles |

### Role Enum Values (Exact Strings)
```
superadmin
org_admin
lead_manager
counselor
application_manager
exam_manager
```

If these strings change on the backend, the frontend will break. Keep them synchronized.

---

## 3. Multi-Tenant Security (CRITICAL)

### The Frontend Sends `orgId` in URL Paths

Example:
```
GET /organizations/abc-123/branches
```

The frontend extracts `orgId` from the decoded JWT and uses it in API calls.

### ⚠️ Backend MUST Independently Verify

**The backend must NOT trust the `orgId` in the URL path blindly.**

On every org-scoped request, the backend must:
1. Decode the JWT from the `Authorization` header (or cookie).
2. Extract `organizationId` from the token payload.
3. Compare it against the `:orgId` path parameter.
4. **If they don't match → reject with 403.**

This prevents:
- A logged-in org user accessing another org's data by changing the URL.
- Frontend bugs accidentally sending the wrong `orgId`.

### Superadmin Exception
- Superadmin users (role = `superadmin`) may access any org's data.
- The backend should allow superadmin to bypass the orgId match check.

---

## 4. Role Change & Token Invalidation

### The Problem
If an admin changes a user's role in the database, the user's existing JWT still contains the old role until it expires.

### Frontend Behavior
- The frontend does NOT silently refresh tokens.
- If the backend returns `401`, the frontend will force logout the user and redirect to `/login`.

### Backend Responsibility
When a user's role is changed:
1. Invalidate all existing tokens for that user (e.g., via a `tokenVersion` column or a blacklist).
2. On the next API call, the old token should return `401`.
3. The frontend will handle the rest (forced logout).

**Alternative (simpler)**: Use short-lived tokens (e.g., 15 minutes) + a refresh token flow. But this is NOT part of Phase 1.

---

## 5. Error Response Contract

The frontend expects ALL error responses to follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": {              // Optional, for validation errors
    "email": "Email is already taken",
    "name": "Name is required"
  }
}
```

### How the Frontend Uses Each Status Code

| Status | Frontend Action |
|--------|----------------|
| `200` | Success — extract `data` from body |
| `201` | Created — extract `data`, show success toast |
| `400` | Bad Request — show `message` in toast |
| `401` | Unauthorized — force logout, redirect to `/login` |
| `403` | Forbidden — show "Access denied" toast, stay on page |
| `422` | Validation — map `errors` object to form field errors |
| `404` | Not Found — show "Resource not found" toast |
| `500` | Server Error — show generic error toast |

### ⚠️ Important for 422 Validation Errors
The `errors` object keys MUST match the form field names exactly.

Example — if the create user form sends:
```json
{ "name": "...", "email": "...", "role": "..." }
```

Then a validation error should return:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Email is already registered"
  }
}
```

The frontend will use `form.setError("email", { message: "Email is already registered" })` to show the error inline on the form field.

---

## 6. Pagination Response Contract

All list endpoints must return pagination in this format:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  },
  "message": "..."
}
```

### Rules
- `page` is **1-based** (first page = 1, not 0).
- `limit` is the number of items per page.
- `total` is the total count of all records.
- `totalPages` is calculated as `Math.ceil(total / limit)`.

The frontend will send `?page=1&limit=10` as query parameters. If the backend defaults differ, document them.

---

## 7. Date Format Contract

The frontend will always send dates as **ISO 8601 strings**:

```
2024-01-01T00:00:00.000Z
```

The backend must:
- Accept this format on all date fields.
- Return dates in the same ISO format.
- Store dates in UTC internally.

---

## 8. CORS Configuration

The frontend runs on `http://localhost:3001`. The backend runs on `http://localhost:3000`.

The backend must set:
```
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

`Allow-Credentials: true` is required because the frontend sends cookies with every request.

---

## 9. Summary of Backend Responsibilities

| # | Responsibility | Why |
|---|---------------|-----|
| 1 | Verify `orgId` from JWT matches `:orgId` in URL | Multi-tenant isolation |
| 2 | Return `401` when token is invalid/expired/revoked | Frontend auto-logout depends on this |
| 3 | Return `403` when role doesn't have access | Frontend shows "Access denied" |
| 4 | Return field-level `errors` object on `422` | Frontend maps to form fields |
| 5 | Use exact `Role` enum strings | Frontend enum must match |
| 6 | Include `organizationId` in JWT payload | Frontend needs it for API calls |
| 7 | Return `pagination` object on all list endpoints | Frontend table depends on it |
| 8 | Accept and return ISO 8601 dates | Prevents timezone bugs |
| 9 | Enable CORS for `localhost:3001` with credentials | Cross-origin cookie support |
| 10 | Invalidate tokens on role change | Prevents stale role access |
