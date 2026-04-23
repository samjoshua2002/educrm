# Phase 1: Foundation — Walkthrough

## What Was Built

### Project Structure

```
src/
├── common/
│   ├── decorators/
│   │   └── roles.decorator.ts        ← @Roles() decorator
│   ├── enums/
│   │   └── roles.enum.ts             ← 6 roles enum
│   └── guards/
│       ├── jwt-auth.guard.ts          ← JWT auth guard
│       └── roles.guard.ts             ← RBAC guard
├── modules/
│   ├── auth/
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register-superadmin.dto.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts        ← Passport JWT strategy
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── branches/
│   │   ├── dto/
│   │   │   ├── create-branch.dto.ts
│   │   │   └── update-branch.dto.ts
│   │   ├── entities/
│   │   │   └── branch.entity.ts
│   │   ├── branches.controller.ts
│   │   ├── branches.module.ts
│   │   └── branches.service.ts
│   ├── organizations/
│   │   ├── dto/
│   │   │   ├── create-organization.dto.ts
│   │   │   └── update-organization.dto.ts
│   │   ├── entities/
│   │   │   └── organization.entity.ts
│   │   ├── organizations.controller.ts
│   │   ├── organizations.module.ts
│   │   └── organizations.service.ts
│   └── users/
│       ├── dto/
│       │   ├── create-user.dto.ts
│       │   └── update-user.dto.ts
│       ├── entities/
│       │   └── user.entity.ts
│       ├── users.controller.ts
│       ├── users.module.ts
│       └── users.service.ts
├── app.module.ts                      ← Root module (ConfigModule + TypeORM + all modules)
└── main.ts                            ← Bootstrap (ValidationPipe + /api prefix + CORS)

Database.sql                           ← Idempotent schema (safe to re-run)
```

---

## API Endpoints Summary

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register-superadmin` | ❌ | — | One-time bootstrap |
| `POST` | `/api/auth/login` | ❌ | — | Returns JWT |
| `GET` | `/api/users/me` | ✅ | Any | Own profile |
| `POST` | `/api/organizations` | ✅ | superadmin | Create org |
| `GET` | `/api/organizations` | ✅ | superadmin | List orgs |
| `GET` | `/api/organizations/:id` | ✅ | superadmin | Get org |
| `PATCH` | `/api/organizations/:id` | ✅ | superadmin | Update org |
| `DELETE` | `/api/organizations/:id` | ✅ | superadmin | Delete org |
| `POST` | `/api/organizations/:orgId/branches` | ✅ | superadmin, org_admin | Create branch |
| `GET` | `/api/organizations/:orgId/branches` | ✅ | superadmin, org_admin | List branches |
| `GET` | `/api/organizations/:orgId/branches/:id` | ✅ | superadmin, org_admin | Get branch |
| `PATCH` | `/api/organizations/:orgId/branches/:id` | ✅ | superadmin, org_admin | Update branch |
| `DELETE` | `/api/organizations/:orgId/branches/:id` | ✅ | superadmin, org_admin | Delete branch |
| `POST` | `/api/organizations/:orgId/users` | ✅ | superadmin, org_admin | Create user |
| `GET` | `/api/organizations/:orgId/users` | ✅ | superadmin, org_admin | List users |
| `PATCH` | `/api/organizations/:orgId/users/:id` | ✅ | superadmin, org_admin | Update user |
| `DELETE` | `/api/organizations/:orgId/users/:id` | ✅ | superadmin, org_admin | Delete user |

---

## Verification

- ✅ TypeScript compiles with **0 errors**
- ✅ All 4 modules load (Auth, Users, Organizations, Branches)
- ⚠️ PostgreSQL connection: `auth_failed` — **database setup required** (see below)

---

## Next Steps for the User

1. Open **pgAdmin** → ensure database `admission_db` exists
2. Verify the password for user `postgres` is `2026`
3. Run [Database.sql](file:///c:/WebMaddyProjects/admission-backend/Database.sql) in pgAdmin (or let TypeORM `synchronize: true` auto-create tables)
4. Restart `npm run start:dev`
5. Test API flow: register-superadmin → login → create org → create branch → create user
