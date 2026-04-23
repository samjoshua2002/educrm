# Phase 1 — Final Implementation Plan

**Date**: 2026-03-26  
**Status**: Review Required

This plan was created after auditing the current backend code against the [Frontend Strategy Document](./Backend-Instructions-Frontend-Strategy.md) and the [Tenant Admission System Blueprint](./Tenant-Admission-System-Blueprint.md).

---

## Current State — What's Already Done ✅

| #   | Item                                                      | Status  |
| --- | --------------------------------------------------------- | ------- |
| 1   | NestJS project setup                                      | ✅ Done |
| 2   | PostgreSQL + TypeORM config                               | ✅ Done |
| 3   | Organization entity (with subscription dates + status)    | ✅ Done |
| 4   | Branch entity (scoped to org)                             | ✅ Done |
| 5   | User entity (with role enum, org + branch FK)             | ✅ Done |
| 6   | Auth module (login, register-superadmin, JWT)             | ✅ Done |
| 7   | Organizations CRUD (superadmin only)                      | ✅ Done |
| 8   | Branches CRUD (org-scoped)                                | ✅ Done |
| 9   | Users CRUD (org-scoped)                                   | ✅ Done |
| 10  | RolesGuard (checks @Roles decorator)                      | ✅ Done |
| 11  | TenantGuard (checks orgId from URL vs JWT)                | ✅ Done |
| 12  | TransformInterceptor (standard response wrapper)          | ✅ Done |
| 13  | @ResponseMessage decorator                                | ✅ Done |
| 14  | ValidationPipe (global, whitelist + forbidNonWhitelisted) | ✅ Done |
| 15  | Database.sql (idempotent)                                 | ✅ Done |
| 16  | API_DOCUMENTATION.md                                      | ✅ Done |

---

## Gaps Found — What Needs to Be Fixed 🔴

### GAP 1: CORS is too permissive

**Current**: `app.enableCors()` — allows all origins.  
**Required**: Frontend runs on `http://localhost:3001`. Must be:

```typescript
app.enableCors({
  origin: 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Risk**: Without `credentials: true`, cookies won't be sent cross-origin.

---

### GAP 2: No global exception filter for standardized error responses

**Current**: NestJS default error responses look like `{ statusCode, message, error }`.  
**Required by Frontend**:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": { "email": "Email is already taken" } // for 422
}
```

**Impact**: Frontend's toast/error handling will break if errors don't follow this contract.  
**Solution**: Create a `GlobalExceptionFilter` that catches all HTTP exceptions and formats them properly. Must handle:

- `400` → Bad Request
- `401` → Unauthorized (frontend auto-logouts on this)
- `403` → Forbidden
- `404` → Not Found
- `409` → Conflict
- `422` → Validation (with field-level `errors` object)
- `500` → Internal Server Error

---

### GAP 3: Pagination is fake — no real DB-level pagination

**Current**: Services use `this.repo.find()` which loads ALL records, then the interceptor wraps the array with `pagination: { page: 1, limit: data.length, total: data.length }`.  
**Required**: Frontend sends `?page=1&limit=10`, backend must use `findAndCount()` with `skip` and `take`.  
**Impact**: Will become a performance disaster with 1000+ leads/users per org.  
**Solution**:

- Create a shared `PaginationDto` (`page`, `limit` query params with defaults).
- Update all `findAll` service methods to use `findAndCount()`.
- Return `{ data, total, page, limit }` — the interceptor already handles this format.

---

### GAP 4: Token invalidation on role change — NOT handled

**Current**: When an admin changes a user's role, the old JWT still contains the old role until expiry (7 days!).  
**Frontend expects**: `401` on next API call so it can force logout.  
**Risk**: A fired counselor can still access the system for up to 7 days with their old token.  
**Solution (Phase 1 — Simple)**:

- Add a `token_version` column (integer, default 0) to the `users` table.
- Include `tokenVersion` in the JWT payload.
- In `JwtStrategy.validate()`, fetch the user from DB and compare `tokenVersion`. If mismatch → throw `UnauthorizedException`.
- When role is changed or user is deactivated → increment `token_version`.

**Trade-off**: This adds a DB query on every authenticated request. But it's the simplest approach without Redis. Acceptable for Phase 1.

---

### GAP 5: Organization status not checked on login/access

**Current**: A user from a `suspended` or `expired` organization can still log in and access APIs.  
**Required**: If org status is `suspended` or `expired`, all org-level users should be blocked immediately.  
**Solution**:

- In `AuthService.login()`: After finding the user, check their org status. If not `active` → throw `UnauthorizedException('Your organization account is suspended/expired')`.
- In `TenantGuard`: Optionally also check org status on every request (stronger enforcement).

---

### GAP 6: Login doesn't set HttpOnly cookie

**Current**: Login returns `{ access_token, user }` in the response body. Frontend sets cookie via `js-cookie`.  
**Required for Production**: Backend should set `Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Strict`.  
**Solution (Phase 1)**:

- For now, keep the current behavior (return token in body, frontend sets client-side cookie).
- Add a `TODO` comment with the production cookie logic.
- This is explicitly a Phase 1 deferral per the frontend doc ("Development Mode" behavior).

---

### GAP 7: No logout endpoint

**Current**: No `POST /auth/logout` endpoint.  
**Required**: Frontend doc mentions this as a future need, especially for HttpOnly cookies.  
**Solution (Phase 1)**: Skip for now. Document as TODO. Frontend handles logout by deleting the client-side cookie.

---

### GAP 8: JWT strategy doesn't read from cookies

**Current**: `ExtractJwt.fromAuthHeaderAsBearerToken()` only reads `Authorization: Bearer ...` header.  
**Required for Production**: When HttpOnly cookie is set, frontend can't send Authorization header — backend must extract from cookie.  
**Solution (Phase 1)**: Keep reading from `Authorization` header only. This matches the "Development Mode" flow described in the frontend doc. Document as Phase 2 change.

---

### GAP 9: Delete endpoints return `void` — interceptor wraps `null`

**Current**: `organizations.service.remove()` returns `Promise<void>`.  
**Result**: Response becomes `{ success: true, data: null, message: "..." }`.  
**Is this okay?**: Actually, yes. `data: null` on delete is perfectly valid. No change needed.

---

### GAP 10: `register-superadmin` unprotected

**Current**: Anyone can call `POST /auth/register-superadmin`. It only checks if a superadmin already exists in DB.  
**Risk**: Low — after first registration, subsequent calls throw `ConflictException`. But there is no rate limiting.  
**Solution (Phase 1)**: The existing "only one superadmin" guard is sufficient. Add rate limiting in Phase 2.

---

## Loopholes That Need Clarity ⚠️

### LOOPHOLE 1: Who can create org_admin users?

**Current**: Both `superadmin` and `org_admin` can create ANY role via `POST /organizations/:orgId/users`.  
**Problem**: An `org_admin` could create another `superadmin` user!  
**Fix Needed**: Service-level check — `org_admin` can only create roles BELOW their level (lead_manager, counselor, application_manager, exam_manager). Only `superadmin` can create `org_admin`.

### LOOPHOLE 2: Can org_admin change their own role?

**Current**: `PATCH /organizations/:orgId/users/:id` accepts a `role` field in the update DTO.  
**Problem**: An `org_admin` could PATCH their own user record and set `role: "superadmin"`.  
**Fix Needed**:

- A user cannot change their own role.
- `org_admin` cannot set role to `superadmin` or `org_admin`.
- Only `superadmin` can set `org_admin` role.

### LOOPHOLE 3: TenantGuard on `/users/me`

**Current**: `UsersController` has `TenantGuard` at the class level. The `/users/me` route has no `orgId` param.  
**Is it safe?**: Yes — TenantGuard checks `if (orgId && ...)`, so it passes through when there's no orgId param. The `/users/me` route only returns the authenticated user's own data. No loophole here.

### LOOPHOLE 4: Superadmin impersonation not implemented

**Blueprint says**: "Fully impersonate an organization user for troubleshooting".  
**Current**: Not implemented.  
**Decision**: Defer to Phase 2. Superadmin can already access all org data via TenantGuard bypass.

---

## Final Phase 1 Checklist — Ordered by Priority

### Priority 1: Security Critical 🔴

| #   | Task                                                                    | Files                                                                   |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | **Fix CORS config** — set specific origin + credentials                 | `main.ts`                                                               |
| 2   | **Create GlobalExceptionFilter** — standardize all error responses      | `common/filters/http-exception.filter.ts`, `main.ts`                    |
| 3   | **Add role hierarchy enforcement** — org_admin can't create superadmin  | `users.service.ts`                                                      |
| 4   | **Block self role escalation** — user can't change own role             | `users.service.ts`                                                      |
| 5   | **Check org status on login** — block suspended/expired org users       | `auth.service.ts`                                                       |
| 6   | **Add `token_version` to user** — invalidate tokens on role change      | `user.entity.ts`, `jwt.strategy.ts`, `users.service.ts`, `Database.sql` |
| 7   | **Rate Limiting** — Protect login and register-superadmin               | `main.ts`, `auth.module.ts`                                             |
| 8   | **Audit Tracking (Basic)** — Track `createdBy` on users, orgs, branches | `user.entity.ts`, etc.                                                  |

### Priority 2: Functional Requirements 🟡

| #   | Task                                                                             | Files                                          |
| --- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| 9   | **Real pagination** — `findAndCount()` + `?page=&limit=` query params            | `PaginationDto`, all services, all controllers |
| 10  | **Validation error formatting** — return `errors` object with field names on 422 | `GlobalExceptionFilter`                        |

### Priority 3: Documentation & Cleanup 🟢

| #   | Task                                                                   | Files                  |
| --- | ---------------------------------------------------------------------- | ---------------------- |
| 11  | Update `Database.sql` with new columns (`token_version`, `created_by`) | `Database.sql`         |
| 12  | Update `API_DOCUMENTATION.md` with pagination params + error examples  | `API_DOCUMENTATION.md` |
| 13  | Add TODO comments for production cookie handling                       | `auth.service.ts`      |
| 14  | Add TODO comments for logout endpoint                                  | `auth.controller.ts`   |

---

## Deferred to Phase 2

| Item                       | Reason                                              |
| -------------------------- | --------------------------------------------------- |
| HttpOnly cookie login      | Frontend doc says dev mode uses client-side cookies |
| JWT from cookie extraction | Not needed until HttpOnly is enabled                |
| `POST /auth/logout`        | Frontend handles logout client-side in Phase 1      |
| Superadmin impersonation   | Blueprint says future scope                         |
| Rate limiting              | Not critical for dev                                |
| Refresh token flow         | Frontend doc explicitly defers this                 |

---

## Summary

Phase 1 foundation is ~70% complete. The core modules, entities, and CRUD are solid. The critical gaps are:

1. **Security**: Role hierarchy + token versioning + org status + **Rate Limiting**
2. **Traceability**: **Audit tracking** (`createdBy`) for core entities
3. **API Contract**: Error response format + real pagination
4. **Config**: CORS needs to be locked down

Once these 14 priority items are addressed, Phase 1 will be production-ready and the frontend can begin integration with confidence.
