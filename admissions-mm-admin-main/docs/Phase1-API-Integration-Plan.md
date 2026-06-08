# Phase 1 — API Integration Plan (Final)

## Superadmin & Organization Admin Frontend

**Base URL**: `http://localhost:3000/api`  
**Frontend URL**: `http://localhost:3001`  
**Date**: 2026-03-26

---

## 1. Core Architecture Decisions

### 1.1 Role Enum (Single Source of Truth)

```typescript
// src/types/auth.ts
export enum Role {
  SUPERADMIN = "superadmin",
  ORG_ADMIN = "org_admin",
  LEAD_MANAGER = "lead_manager",
  COUNSELOR = "counselor",
  APPLICATION_MANAGER = "application_manager",
  EXAM_MANAGER = "exam_manager",
}
```

All role checks across middleware, layouts, sidebars, and pages must use this enum. No string literals anywhere.

---

### 1.2 Token & Cookie Strategy

#### Cookie Setup

| Property   | Development | Production |
| ---------- | ----------- | ---------- |
| `HttpOnly` | `false`     | `true`     |
| `Secure`   | `false`     | `true`     |
| `SameSite` | `Lax`       | `Strict`   |
| `Path`     | `/`         | `/`        |
| `Max-Age`  | 1 day       | 1 day      |

- In **development**, the cookie is NOT HttpOnly so `js-cookie` can read/write it for convenience. The JWT is decoded client-side via `jwt-decode` for display purposes only.
- In **production**, the cookie is HttpOnly + Secure. The frontend cannot read the token directly. Instead, user data is fetched via `GET /users/me` on app mount, cached, and used for UI rendering. The browser still sends the cookie automatically with every API request.

#### Cookie Name: `auth_token`

#### Login Flow

1. `POST /auth/login` → receive `{ access_token, user }`.
2. Set `auth_token` cookie with `access_token` value.
3. Store `user` object in Zustand auth store (in memory only, NOT localStorage).
4. `queryClient.clear()` to wipe any previous session cache.
5. `router.push()` to role-appropriate dashboard.

#### Logout Flow

1. Delete `auth_token` cookie.
2. Reset Zustand auth store to `null`.
3. `queryClient.clear()` to destroy all cached data (prevents cross-role data leakage).
4. Redirect to `/login`.

---

### 1.3 JWT Decode Trust Level

**Decision: Decoded JWT = "Display Hint", NOT Security Truth.**

- The decoded role/orgId from the JWT is used ONLY for:
  - Showing/hiding sidebar items.
  - Client-side route redirection.
  - Passing `orgId` to API URL paths.
- The decoded role is NEVER treated as a security gate. All real authorization happens on the backend.
- If someone tampers with the cookie, the backend will reject the request with 401/403 and the frontend interceptor will force logout.

---

### 1.4 OrganizationId Strategy

- **Source**: Decoded from the JWT payload (`organizationId` field).
- **Available instantly** on page load — no waiting for API calls.
- **Superadmin** users have `organizationId = null` in their token.
- **Org users** always have a valid `organizationId`.
- **Trust**: The `orgId` from the token is a display hint. The backend MUST independently verify that the requesting user's `orgId` matches the `:orgId` in the API path. The frontend cannot enforce multi-tenant isolation.

---

### 1.5 Role Change & Force Logout

**Decision: Force Logout on Role Change.**

- If the backend admin changes a user's role, that user's existing JWT is still valid until expiry.
- The backend must maintain a mechanism (e.g., token version or blacklist) to invalidate old tokens.
- On the frontend:
  - The API interceptor catches `401` responses.
  - On `401` → immediate forced logout + redirect to `/login`.
  - No attempt to silently refresh or keep old UI.

---

## 2. Routing & Protection Architecture

### 2.1 Three Layers of Protection

| Layer                                | Responsibility                                         | What It Checks                                         |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ |
| **Middleware** (`src/middleware.ts`) | First gate — runs on every request before page renders | Cookie exists? Which route prefix?                     |
| **Layout** (per route group)         | Second gate — runs after middleware passes             | Decoded role matches expected role for this section?   |
| **Backend**                          | Final authority                                        | Token signature valid? Role authorized? OrgId matches? |

### 2.2 Middleware Rules (Edge Runtime)

Middleware runs in Next.js Edge Runtime. It does NOT decode the JWT (no `jwt-decode` in edge). It only checks:

1. **Cookie exists?**
   - No cookie + accessing `/superadmin/*` or `/organization/*` → redirect to `/login`.
   - Has cookie + accessing `/login` → redirect to appropriate dashboard (use a second cookie `user_role` set during login for this check).
2. **Route prefix vs role cookie:**
   - `user_role === 'superadmin'` trying `/organization/*` → redirect to `/superadmin/dashboard`.
   - `user_role !== 'superadmin'` trying `/superadmin/*` → redirect to `/organization/dashboard`.

**Why a separate `user_role` cookie?**

- Edge Runtime cannot run `jwt-decode`.
- A lightweight, non-HttpOnly `user_role` cookie is set alongside `auth_token` during login.
- This cookie is ONLY for middleware routing. It has zero security value.
- On logout, both cookies are cleared.

### 2.3 Layout-Level Role Guard

Each layout wraps its children with a client component that:

1. Reads the decoded JWT (in development) or the cached user profile.
2. If the role doesn't match the layout's expected role → shows an "Unauthorized" screen or redirects.
3. This is the second defense and handles edge cases that middleware cannot (e.g., stale `user_role` cookie).

### 2.4 Route Protection Summary

| Route             | Middleware Check                         | Layout Check              | Allowed Roles                                                                   |
| ----------------- | ---------------------------------------- | ------------------------- | ------------------------------------------------------------------------------- |
| `/login`          | Redirect if already logged in            | None                      | Public                                                                          |
| `/superadmin/*`   | Cookie exists + role cookie = superadmin | Decoded role = superadmin | `SUPERADMIN`                                                                    |
| `/organization/*` | Cookie exists + role cookie ≠ superadmin | Decoded role ∈ org roles  | `ORG_ADMIN`, `LEAD_MANAGER`, `COUNSELOR`, `APPLICATION_MANAGER`, `EXAM_MANAGER` |

---

## 3. Navigation & Role-Based UI

### 3.1 Sidebar Filtering (Config-Driven, Not Hardcoded)

Each nav item in `organization-nav.ts` will have an `allowedRoles` array:

```typescript
{
  title: "Lead Manager",
  url: "/organization/lead-manager",
  icon: Users,
  allowedRoles: [Role.ORG_ADMIN, Role.LEAD_MANAGER],
}
```

The sidebar component filters items:

```typescript
items.filter(
  (item) => !item.allowedRoles || item.allowedRoles.includes(currentUserRole),
);
```

This avoids hardcoded `if/else` chains and scales cleanly.

### 3.2 Action-Level UI Guards

Buttons like "Create Organization", "Delete Branch", etc. are wrapped in a reusable `<RoleGate>` component:

```tsx
<RoleGate allowed={[Role.ORG_ADMIN]}>
  <Button>Create Branch</Button>
</RoleGate>
```

If the user's role is not in `allowed`, the children are not rendered. No CSS hiding — the DOM element simply doesn't exist.

---

## 4. API & Data Layer

### 4.1 API Layer (`src/lib/api.ts`)

- Axios instance with `baseURL` from `NEXT_PUBLIC_API_URL`.
- **Request Interceptor**: Read `auth_token` cookie, attach as `Authorization: Bearer <token>`.
- **Response Interceptor**:
  - On success: unwrap `{ success, data, message }` → return `data`.
  - On `401`: Force logout.
  - On `403`: Show `toast.error("You don't have permission to perform this action")`.
  - On `422` (validation): Extract field errors from response body → return them to the form (don't just toast).
  - On `500`: Show `toast.error("Something went wrong. Please try again.")`.

### 4.2 Error Handling Strategy

| HTTP Status        | Frontend Behavior                                              |
| ------------------ | -------------------------------------------------------------- |
| `401 Unauthorized` | Force logout + redirect to `/login`                            |
| `403 Forbidden`    | Toast: "Access denied" — stay on page                          |
| `422 Validation`   | Return field errors to form via `setError()` (react-hook-form) |
| `400 Bad Request`  | Toast with backend `message`                                   |
| `404 Not Found`    | Toast: "Resource not found"                                    |
| `500 Server Error` | Toast: "Something went wrong"                                  |

### 4.3 React Query Key Convention

| Resource            | Query Key                              |
| ------------------- | -------------------------------------- |
| Organizations list  | `['organizations', { page, limit }]`   |
| Single organization | `['organization', id]`                 |
| Branches list       | `['branches', orgId, { page, limit }]` |
| Users list          | `['users', orgId, { page, limit }]`    |
| Current profile     | `['profile', 'me']`                    |

### 4.4 Query Invalidation Rules

| After Mutation      | Invalidate                      |
| ------------------- | ------------------------------- |
| Create Organization | `['organizations']` (all pages) |
| Create Branch       | `['branches', orgId]`           |
| Create User         | `['users', orgId]`              |

### 4.5 Pagination Mapping

```typescript
// UI → API (sending)
const apiPage = tablePageIndex + 1;

// API → UI (receiving)
const tablePageIndex = pagination.page - 1;
const totalPages = pagination.totalPages;
```

### 4.6 Date Handling

All date inputs must be converted before submission:

```typescript
const isoDate = new Date(formValue).toISOString();
```

---

## 5. Implementation Rounds

### Round 1: Auth Foundation

- [ ] Create `Role` enum in `src/types/auth.ts`.
- [ ] Create API response types in `src/types/api.ts`:
  - `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`.
- [ ] Install `js-cookie` + `jwt-decode` + `@types/js-cookie`.
- [ ] Rewrite `src/stores/auth-store.ts`:
  - Hydrate from decoded cookie on mount.
  - `login(token, user)`: set cookie + store user.
  - `logout()`: clear cookie + clear store + clear query cache.
- [ ] Rewrite `src/lib/api.ts`:
  - Interceptors with status-specific error handling.
  - Typed helper functions.
- [ ] Rewrite `src/middleware.ts`:
  - Cookie existence check only.
  - Role cookie for route-prefix validation.
  - No JWT decoding in middleware.
- [ ] Connect login form to `POST /auth/login`.
- [ ] Set both `auth_token` and `user_role` cookies on login.
- [ ] Clear both cookies on logout.
- [ ] Test: Login → redirect → middleware blocks wrong routes → logout clears everything.

### Round 2: Superadmin Module

- [ ] Create `src/types/organization.ts` (Organization type).
- [ ] Create `src/lib/validations/organization.ts` (Zod schema with ISO date transform).
- [ ] Create `src/hooks/use-organizations.ts`:
  - `useOrganizations(page, limit)` with structured keys.
  - `useCreateOrganization()` with invalidation.
- [ ] Build organizations table with pagination mapping.
- [ ] Build create organization dialog with date conversion.
- [ ] Build superadmin dashboard with real org count data.
- [ ] Build subscriptions page (filtered org view).

### Round 3: Organization Module

- [ ] Update `organization-nav.ts` with `allowedRoles` per item.
- [ ] Build `<RoleGate>` component.
- [ ] Create `src/hooks/use-branches.ts` with `orgId` from token.
- [ ] Create `src/hooks/use-users.ts` with `orgId` from token.
- [ ] Build branches table + create dialog.
- [ ] Build users table + create dialog (role dropdown from `Role` enum, branch dropdown from branches query).

### Round 4: Hardening

- [ ] Audit all hooks for `enabled: !!orgId` guards.
- [ ] Add loading skeletons to all data pages.
- [ ] Test: Login as different roles → verify sidebar filtering.
- [ ] Test: Logout → login as different role → verify no data leakage.
- [ ] Test: Tamper cookie → verify backend rejects + frontend logs out.
- [ ] Test: Middleware blocks cross-role route access.

---

## 6. File Structure (Final)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── _components/saas-login-form.tsx
│   ├── superadmin/
│   │   ├── layout.tsx                    # Role guard: SUPERADMIN only
│   │   ├── dashboard/page.tsx
│   │   ├── organizations/
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   │       ├── organizations-table.tsx
│   │   │       ├── columns.tsx
│   │   │       └── create-organization-dialog.tsx
│   │   └── subscriptions/page.tsx
│   └── organization/
│       ├── layout.tsx                    # Role guard: all org roles
│       ├── dashboard/page.tsx
│       ├── branches/
│       │   ├── page.tsx
│       │   └── _components/
│       ├── users/
│       │   ├── page.tsx
│       │   └── _components/
│       ├── leads/page.tsx
│       ├── lead-manager/page.tsx
│       ├── applications/page.tsx
│       ├── gd-interview/page.tsx
│       ├── communications/page.tsx
│       ├── payments/page.tsx
│       ├── events/page.tsx
│       ├── forms/page.tsx
│       ├── students/page.tsx
│       └── settings/
│           ├── page.tsx
│           ├── organization/page.tsx
│           └── locations/page.tsx
├── components/
│   ├── ui/                               # Existing shadcn components
│   ├── data-table/                       # Existing data table
│   └── role-gate.tsx                     # NEW: Role-based UI guard
├── hooks/
│   ├── use-organizations.ts
│   ├── use-branches.ts
│   ├── use-users.ts
│   └── use-auth.ts                       # Helper to get decoded user
├── lib/
│   ├── api.ts                            # Axios instance + helpers
│   └── validations/
│       ├── auth.ts
│       ├── organization.ts
│       ├── branch.ts
│       └── user.ts
├── navigation/
│   ├── superadmin-nav.ts
│   ├── organization-nav.ts              # With allowedRoles
│   └── sidebar/sidebar-items.ts         # Existing (main) nav
├── stores/
│   └── auth-store.ts                     # Cookie-backed, no localStorage
├── types/
│   ├── api.ts                            # ApiResponse, PaginatedResponse
│   ├── auth.ts                           # Role enum, User, AuthState
│   ├── organization.ts
│   ├── branch.ts
│   └── user.ts
└── middleware.ts                          # Cookie + role-cookie check only
```

---

## 7. Rules (Non-Negotiable)

1. **Cookie = single source of truth** for auth state.
2. **Decoded JWT = display hint only**, never a security gate.
3. **Backend is the final authority** on role and tenant checks.
4. **No localStorage for tokens** — cookies only.
5. **No hardcoded orgId** — always from decoded token.
6. **queryClient.clear() on every login and logout** — prevents data leakage.
7. **Structured query keys** — no flat strings.
8. **ISO dates only** — convert before API submission.
9. **Status-specific error handling** — 422 goes to form, 401 forces logout, rest go to toast.
10. **Config-driven role filters** — `allowedRoles` arrays, not `if/else` chains.

---

## 8. Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```
