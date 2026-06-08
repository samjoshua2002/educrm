# Frontend Implementation Plan: `/organization/lead-manager` and `/organization/leads`

## Goal

Make both organization-facing pages fully dynamic using the tenant backend APIs:

- `http://localhost:3001/organization/lead-manager`
- `http://localhost:3001/organization/leads`

This plan maps frontend work to:

- `admissions-tenant-api-main/API_DOCUMENTATION.md`
- `admissions-tenant-api-main/docs/Lead-Processing-Workflow.md`

Scope is frontend only (React/Next.js UI, hooks, state, UX flows, route behavior).  
No backend changes are included in this plan.

---

## Non-Negotiable Architecture Decisions (Address Current Risks)

This section explicitly addresses the known implementation pain points so we don’t “paper over” them during API integration.

### 1) Separate **Verification Status** vs **Lifecycle Status** (Critical)

Current terminology conflicts are the biggest risk. The frontend must treat these as **two separate concepts**:

- **VerificationStatus** (quality gate):
  - `unverified | verified | disqualified`
- **LifecycleStatus** (journey stage):
  - `new | working | nurturing | converted | closed`

**Frontend rule**: never use one field to represent both, and never mix “verified/qualified” terminology in UI logic.

- **UI implications**
  - `/organization/lead-manager` = verification queue filtered by `verificationStatus=unverified`
  - `/organization/leads` = lifecycle pipeline filtered by lifecycle + verification, not by one mixed field
  - badges and filters should render these as separate chips (or separate filter groups)

> **Backend note**: current API exposes a single `status` query param today. The frontend plan will introduce a **view model** with `verificationStatus` and `lifecycleStatus` and implement a mapping layer until backend supports both fields explicitly.

### 2) Cache strategy to avoid “Invalidate Everything” explosions

`invalidateQueries(["leads"])` will not scale once we add tabs, detail sheets, and counters/widgets.

**Plan**:

- **Targeted invalidation** by queryKey params (status/filter scoped keys)
- For high-frequency actions (verify/disqualify/assign), prefer **optimistic updates** on the affected lists:
  - remove from unverified list
  - add to verified/working list (where applicable)
  - update detail cache entry if open

### 3) Avoid over-abstracting “one table for everything”

We will keep:

- **Shared core**: table row rendering + filter bar primitives + action menu components
- **Separate page composition**: each page defines its own action set and default scopes

This prevents prop explosions like `allowVerify/allowAssign/allowClose/...`.

### 4) URL filter synchronization: URL is the source of truth

To avoid hydration/double-fetch issues in Next.js App Router:

- Use a single filter state manager where **URL search params drive state**
- Derive query inputs from URL params only (local state is only for draft inputs before “Apply”)

### 5) Prefer permissions over role checks in UI

Avoid `if (role === "lead_manager")` scattered across pages.

**Plan**:

- Create a `can(permission: string)` helper (e.g., `can("lead.verify")`)
- Centralize permission mapping per role in one place (frontend-only)
- UI gates actions via `can(...)` and still relies on backend errors as final enforcement

### 6) Modal state management to prevent race/stale selection bugs

We will not manage modal state per-row.

**Plan**:

- Use a single centralized modal/action state:
  - `selectedLeadId`
  - `activeAction` (verify/assign/note/close)
  - `draftPayload`
- Use an action-sheet pattern: one modal open at a time, no nesting.

### 7) Follow-up datetime + timezone standard

To prevent “date changed” bugs:

- store/send timestamps as **UTC ISO strings**
- display in **local timezone**
- keep `followUpDate=YYYY-MM-DD` handling consistent across UI and API expectations

### 8) Hard delete policy (frontend behavior)

`DELETE /leads/:id` is risky for audit/history.

**Plan**:

- Hide “Delete” by default in org UI unless explicitly required
- If shown, require strong confirmation and show an irreversible warning
- Prefer “Close”/“Disqualify” for operational workflows

### 9) Transition validation (UI + backend)

**Plan**:

- Implement frontend “allowed actions by state” matrix
- Handle backend rejections gracefully (toast + no optimistic mutation on failure)

### 10) Timeline strategy (future-proof now)

Notes/assignment/status/closure events should feed a unified timeline UI later.

**Plan**:

- Keep modal payload shapes aligned with future timeline fields (content, reason, timestamps)
- Design mutations/components so timeline UI can subscribe later without refactors

### 11) Workload definition (for assignment UI)

Before building “smart assignment” UI, define what workload means:

- **Default**: active assigned leads count (status != closed/converted)
- Keep this as a configurable assumption until backend provides a metric endpoint

### 12) ScoreBand filter constraints

Score/scoring may evolve.

**Plan**:

- Treat `scoreBand` as optional filter; hide it if no data present
- Avoid computing score client-side; display only what backend returns

### 13) Org-scoped action safety

**Plan**:

- orgId for requests must come from authenticated user context (store), not from URL
- if mismatch occurs, hard fail with a safe error state

### 14) Cache vs role changes

If user’s role/permissions change, stale cached data must not remain visible.

**Plan**:

- on auth user change (role/org), clear react-query cache (or namespace keys by orgId + role)

---

## Target Product Behavior

### `/organization/lead-manager` (Verification Queue)

- Primary queue for `unverified` leads (verification status queue).
- Lead Manager / Org Admin can:
  - Verify (`PATCH /leads/:id/verify`)
  - Disqualify (`PATCH /leads/:id/verify`)
  - Reassign (`PATCH /leads/:id/assign`)
  - Add note (`POST /leads/:id/notes`)
  - Update workflow status (`PATCH /leads/:id/workflow-status`)
  - Close (`PATCH /leads/:id/close`)
- Supports filters: search, status, assignedTo, followUpDate, scoreBand.

### `/organization/leads` (Processed/Working Pipeline)

- Focus on post-verification leads and their lifecycle stages (verified/working/converted/closed).
- Supports counselor operational workflows:
  - Add notes and schedule follow-up
  - Move lifecycle status (working/converted/reopen where allowed)
  - Close with reason
- Shared table and filters with route-specific defaults.

---

## API Mapping (Frontend Consumption)

### List + Detail

- `GET /api/organizations/:orgId/leads`
  - Query params: `page`, `limit`, `search`, `status`, `assignedTo`, `followUpDate`, `scoreBand`
- `GET /api/organizations/:orgId/leads/:id`

### Actions

- `PATCH /api/organizations/:orgId/leads/:id/status` (compat/basic update)
- `PATCH /api/organizations/:orgId/leads/:id/verify`
- `PATCH /api/organizations/:orgId/leads/:id/assign`
- `POST /api/organizations/:orgId/leads/:id/notes`
- `PATCH /api/organizations/:orgId/leads/:id/workflow-status`
- `PATCH /api/organizations/:orgId/leads/:id/close`
- `DELETE /api/organizations/:orgId/leads/:id` (admin only)

---

## Workflow Alignment (from Lead Processing Workflow doc)

### Stage 2: Verification

- Queue = unverified leads.
- Actions:
  - Qualify -> verified
  - Disqualify -> disqualified (reason required in UI validation)
- Enforce status guard in UI: verification actions visible only for unverified records.

### Stage 3: Assignment

- Reassign only to active counselors in same org.
- Track and display assigned counselor in table and lead details sheet.

### Stage 4: Counselor Work

- Add Note modal with optional:
  - `disposition`
  - `nextFollowUpAt`
- On note add success, refresh table and current lead details.

### Stage 5: Status Progression

- Reflect status transitions in UI action menu (show only valid actions for current status).
- Render **verification** and **lifecycle** as separate UI concepts (two badges or two filter groups), to avoid terminology conflicts.

---

## Frontend Architecture Plan

### 1) Shared Data Layer

- Extend or reuse `src/hooks/use-leads.ts` as the single source for:
  - list query
  - detail query
  - verify mutation
  - assign mutation
  - add note mutation
  - workflow status mutation
  - close mutation
  - delete mutation
- Standardize query keys:
  - `["leads", { orgId, page, limit, search, status, assignedTo, followUpDate, scoreBand }]`
  - `["lead", leadId]`
- Use targeted invalidation and/or optimistic updates instead of a single broad `invalidateQueries(["leads"])` (see cache strategy above).

### 2) Route-level Composition

- Build one reusable lead table view component with props for:
  - default status scope
  - visible actions
  - page title/subtitle
- Reuse across:
  - `/organization/lead-manager` (default `status=unverified`)
  - `/organization/leads` (default status tabs for verified/working/converted/closed)

### 3) Type Safety

- Add/align types for:
  - lead status enum values
  - verify payload
  - assign payload
  - note payload
  - close payload
  - filter query model
- Add UI adapter mapping from API lead to table row view model.

---

## UI/UX Implementation Plan

### A. `/organization/lead-manager`

1. Replace dummy data source with `useLeads(...)`.
2. Default filter:
   - `status=unverified`
3. Table columns (match existing):
   - Name, Mobile, Location, Stage, Status, Assigned To, Source, Action
4. Action dropdown:
   - Verify
   - Disqualify
   - Reassign
   - Add Note
   - Update Workflow Status
   - Close
   - Delete (role-gated)
5. Modal set:
   - Verify/Disqualify modal (reason required for disqualify)
   - Assign modal (counselor selector + optional reason)
   - Add Note modal (content + disposition + nextFollowUpAt)
   - Close modal (closure reason + notes)

### B. `/organization/leads`

1. Convert page to same dynamic lead table shell.
2. Default scope:
   - show verified + working by default (configurable tab/filter)
3. Add quick status tabs:
   - Verified, Working, Converted, Closed
4. Keep same advanced filters and pagination.
5. Actions tuned for processed leads:
   - Add Note
   - Update Workflow Status
   - Close / Reopen (if backend action available via workflow status)

---

## Filter, Search, and Pagination Behavior

- Server-driven paging:
  - page/limit synced to URL search params for refresh-safe navigation.
  - URL is the source of truth for applied filters (avoid local state + URL conflicts).
- Debounced search input (300-500ms) to reduce request volume.
- Advanced filters:
  - `assignedTo`, `followUpDate`, `scoreBand`, `status`
- Reset filter action:
  - reset URL + local filter state + reload list.

---

## State and Error Handling

- Loading states:
  - full-page skeleton on first load
  - subtle spinner for filter/pagination transitions
- Empty states:
  - no results (filtered)
  - no leads yet (initial)
- Mutation feedback:
  - success/error toasts from API message
  - disable submit buttons while pending
- Failure handling:
  - preserve modal form data on failed request
  - show inline field-level validation when applicable

---

## Role-Based UI Gating

Avoid role checks inside components. Gate UI actions via `can("lead.verify")`, `can("lead.assign")`, etc.

Use RBAC matrix in API doc as the source to build the frontend permission mapping:

- Lead Manager / Org Admin: verify, assign, close, status updates, notes
- Staff: notes, workflow-status, close (as allowed)
- Superadmin: all organization-scoped actions

UI should hide unavailable actions, but backend remains the ultimate enforcement.

---

## Implementation Phases

### Phase 1: Data and Hooks

- Finalize hook contracts in `use-leads.ts`.
- Add all required mutations and query params support.
- Add list/detail key invalidation strategy.

### Phase 2: `/organization/lead-manager`

- Replace dummy dataset with API.
- Wire filters, pagination, and search.
- Implement verify/disqualify/assign/note/close action modals.

### Phase 3: `/organization/leads`

- Implement dynamic pipeline list.
- Add status tabs and advanced filters.
- Reuse modal/action components where possible.

### Phase 4: Polish and Validation

- Loading/empty/error states.
- Permission-based action visibility.
- Mobile responsiveness and consistency with existing lead-manager style.

---

## QA / Verification Checklist

### Functional

- Unverified leads appear on `/organization/lead-manager`.
- Verify action moves lead out of unverified queue and into `/organization/leads` verified scope.
- Disqualify action removes lead from main queue and marks as disqualified.
- Reassign updates assigned counselor and persists after refresh.
- Add note + follow-up date persists and refetches correctly.
- Close action requires reason and reflects closed status.

### Filters

- Search works for name/email/phone.
- `assignedTo=me` query works for current user.
- `followUpDate` filter returns expected subset.
- `scoreBand` filter works if values are present.

### UX

- No API actions trigger full page reload.
- Toasts and disabled buttons behave correctly during pending actions.
- Empty states are clear and actionable.

---

## Risks and Mitigations

- **Status terminology mismatch** across old/new flows.
  - Mitigation: enforce the explicit split (verification vs lifecycle) and centralize badge/constants/mapping in one place.
- **Query invalidation explosion** causing stale data or excessive refetch.
  - Mitigation: scoped query keys + targeted invalidation + optimistic updates for verify/assign flows.
- **Reusable table over-abstraction** leading to prop explosion.
  - Mitigation: shared core primitives + separate page compositions.
- **URL + local filter state conflicts** causing double fetch and hydration bugs.
  - Mitigation: URL is the source of truth; local state only for drafts before Apply.
- **Role vs permission drift** (hardcoded role checks in UI).
  - Mitigation: `can("lead.verify")` style permission gates.
- **Modal state chaos** (stale selected lead, nested dialogs).
  - Mitigation: centralized action state + one-modal-at-a-time action sheet.
- **Follow-up timezone bugs** (UTC vs local).
  - Mitigation: store/send UTC ISO strings; display local; standardize date-only filter semantics.
- **Hard delete risk** impacting auditability.
  - Mitigation: hide delete by default; prefer close/disqualify; strong confirmation if enabled.
- **Transition validation gaps** (UI shows wrong actions; backend rejects).
  - Mitigation: UI transition matrix + robust error handling on backend rejections.
- **Timeline missing strategy** (notes/assignments/status scattered).
  - Mitigation: align payloads/components for a future unified timeline view.

---

## Out of Scope (for this plan)

- Backend endpoint changes or new DB fields.
- Lead conversion to application flow UI.
- Activity timeline read APIs (if not yet exposed).
- Automation/scoring engine implementation.
