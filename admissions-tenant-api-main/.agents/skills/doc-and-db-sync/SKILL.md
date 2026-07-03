---
name: doc-and-db-sync
description: Ensure API_DOCUMENTATION.md is always updated alongside API modifications, and Database.sql is always updated idempotently for DB changes.
---

# Documentation and Database Synchronization Rules

Whenever modifying the project, you MUST strictly adhere to the following two workflows. These rules ensure that the project is always fully documented and the database schema is fully recoverable.

## 1. Keep API_DOCUMENTATION.md Updated
Any time an API route is added, modified, or deleted, you MUST immediately record the change in `C:\educrm_main\admissions-tenant-api-main\API_DOCUMENTATION.md`.

Each API entry in the documentation MUST include:
- **Description**: What the API does and when to use it.
- **Method & URL**: Standardized route path (e.g., `POST /api/leads`).
- **Headers**: All required authentication or content headers (e.g., `Authorization: Bearer <token>`).
- **Parameters**: Details regarding path parameters (e.g., `:id`) and query parameters (e.g., `?limit=10`).
- **Request Example**: A JSON payload representing the body (for POST/PUT/PATCH).
- **Response Example**: A sample JSON response that strictly complies with the **Standard API Response Structure** skill (including `success`, `data`, `message`, and `pagination` where relevant).

## 2. Keep Database.sql Updated and Idempotent
Any time a database schema change is introduced (e.g., a new TypeORM entity is added, a column is appended, or an index is created), you MUST update `C:\educrm_main\admissions-tenant-api-main\Database.sql`.

The `Database.sql` file acts as the single source of truth for the database schema. It MUST be written such that the user can copy the entire file, paste it into pgAdmin4, and run it to completely establish or update the schema **without any errors, data loss, or duplicate relations.**

To achieve this, strictly use idempotent SQL patterns constraint mapping:
- Always use `CREATE TABLE IF NOT EXISTS`.
- Always use `CREATE INDEX IF NOT EXISTS`.
- For `ENUM` types, wrap logic in `DO $$ BEGIN IF NOT EXISTS ... CREATE TYPE ... END $$;`.
- **For appending new columns to existing tables**:
  1. Add the column directly to the base `CREATE TABLE` definition (for fresh setups).
  2. Append an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` statement to the bottom of the file (for existing databases).
  ```sql
  -- Safe injection for existing databases
  ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);
  ```
- Avoid destructive commands (`DROP TABLE`, `DROP COLUMN`) to ensure existing data is never harmed upon re-execution.
- **Dependency Order**: Ensure parent tables (e.g., `organizations`) are created BEFORE child tables (e.g., `branches`) that reference them via Foreign Keys.
- **One-Shot Safety**: The entire file MUST be runnable as a single block in a fresh database or an existing one without any error 42P01 (relation not found) or 42701 (duplicate column).

