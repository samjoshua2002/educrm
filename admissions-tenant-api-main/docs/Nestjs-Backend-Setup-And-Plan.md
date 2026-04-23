# Backend Setup & Implementation Plan (NestJS + PostgreSQL)

---

# 1. Objective

This document defines how to:

* Setup a NestJS backend project
* Connect it with PostgreSQL
* Structure the project properly for scalability
* Plan API implementation based on your admission system

This is a **production-oriented structure**, not a beginner setup.

---

# 2. Initial Setup (NestJS Project)

## Step 1: Install Nest CLI

```bash
npm install -g @nestjs/cli
```

## Step 2: Create Project

```bash
nest new admission-backend
```

Choose package manager: npm or yarn

---

## Step 3: Run Project

```bash
cd admission-backend
npm run start:dev
```

---

# 3. Install Required Dependencies

## Core Dependencies

```bash
npm install @nestjs/config @nestjs/typeorm typeorm pg
```

## Validation & DTO

```bash
npm install class-validator class-transformer
```

## Auth (for later)

```bash
npm install @nestjs/jwt passport passport-jwt bcrypt
```

## Utility

```bash
npm install uuid
```

---

# 4. PostgreSQL Setup (Local)

## Install PostgreSQL (if not installed)

* Download from official site
* Create a database: `admission_db`

## Example DB Credentials

* Host: localhost
* Port: 5432
* Username: postgres
* Password: your_password
* Database: admission_db

---

# 5. Environment Configuration

Create `.env` file in root:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=admission_db
```

---

# 6. Configure Database (TypeORM)

Update `app.module.ts`

```ts
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  autoLoadEntities: true,
  synchronize: true, // dev only
})
```

---

# 7. Recommended Project Structure

Do NOT keep everything flat.

```
src/
 ├── modules/
 │    ├── auth/
 │    ├── users/
 │    ├── organizations/
 │    ├── branches/
 │    ├── leads/
 │    ├── assignments/
 │    ├── applications/
 │    ├── students/
 │    ├── payments/
 │    ├── events/
 │
 ├── common/
 │    ├── decorators/
 │    ├── guards/
 │    ├── filters/
 │    ├── interceptors/
 │
 ├── config/
 ├── database/
 ├── main.ts
```

---

# 8. Development Phases (VERY IMPORTANT)

Do NOT build randomly.
Follow this order strictly.

---

# Phase 1: Foundation (Core System)

## Modules

* Auth
* Users
* Organizations
* Branches

## Features

* Create organization
* Create users with roles
* Login system
* Role-based access (basic)

---

# Phase 2: Lead System

## Modules

* Leads
* Lead Verification

## Features

* Create lead
* Store raw leads
* Update lead status
* Soft duplicate check
* Lead verification by manager

---

# Phase 3: Assignment Engine

## Modules

* Assignment

## Features

* Auto assignment logic
* Manual reassignment
* Workload-based distribution
* Assignment history

---

# Phase 4: Lead Workflow

## Features

* Lead stages (fixed)
* Disposition codes
* Follow-up tracking
* Lead notes
* Lead scoring
* Lead closure

---

# Phase 5: Student + Application

## Modules

* Students
* Applications

## Features

* Create student on application
* Multiple applications per student
* Application status flow
* Edit application

---

# Phase 6: Payment Module

## Modules

* Payments

## Features

* Track payment
* Store payment status
* Integrate gateway (later)

---

# Phase 7: Event Module

## Modules

* Events
* Venues

## Features

* Create exam/interview
* Multiple venues
* Assign students

---

# 9. Entity Planning (High-Level)

You will need entities like:

* User
* Organization
* Branch
* Lead
* LeadNote
* Assignment
* Student
* Application
* Payment
* Event
* Venue

---

# 10. API Design Approach

Follow REST structure:

## Example

### Leads

* POST /leads
* GET /leads
* GET /leads/:id
* PATCH /leads/:id

### Assignment

* POST /assign
* PATCH /reassign

### Application

* POST /applications
* GET /applications

---

# 11. Important Rules While Coding

## 1. Never trust input

* Always validate DTOs

## 2. Never mix logic

* Controller → request/response only
* Service → business logic

## 3. Keep modules isolated

* No cross-module chaos

## 4. Always plan before coding

* Each module → design → then code

---

# 12. Common Mistakes (Avoid These)

❌ Building all modules at once
❌ Skipping validation
❌ Hardcoding logic
❌ No role checks
❌ No separation of concerns

---

# 13. Next Step

After setup:

👉 Start with:

1. Auth Module
2. Organization Module
3. User Roles

Then move to Leads.

---

# Final Advice

You are building a **real SaaS product**, not a college project.

If you rush structure now → you will suffer later.

If you build clean modules → scaling becomes easy.

Stay disciplined.
