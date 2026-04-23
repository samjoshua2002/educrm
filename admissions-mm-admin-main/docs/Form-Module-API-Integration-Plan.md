# Form Module — API Integration Plan

> Goal: Replace the `mockStore.ts` (Zustand) with real backend API calls using React Query hooks, following the established pattern from `use-branches.ts`.

---

# 1. Current State (What We Have)

| Layer | Current | Target |
| :--- | :--- | :--- |
| **State** | `useFormStore` (Zustand, `mockStore.ts`) | React Query hooks (`use-forms.ts`) |
| **Data Source** | Hardcoded arrays in memory | Backend API (`/organizations/:orgId/forms`) |
| **Templates** | Hardcoded in `mockStore.ts` | Backend API (`/form-templates`) |
| **Responses** | Hardcoded in `mockStore.ts` | Backend API (`/organizations/:orgId/forms/:id/responses`) |
| **Public Form** | Not implemented | Backend API (`/public/forms/:slug`) |

---

# 2. API Endpoints to Integrate

## 2.1 Forms (Admin — Authenticated)

| Action | Method | Endpoint | Used In |
| :--- | :--- | :--- | :--- |
| List Forms | `GET` | `/organizations/:orgId/forms` | Listing Page |
| Create Form | `POST` | `/organizations/:orgId/forms` | Create Page |
| Update Form | `PATCH` | `/organizations/:orgId/forms/:id` | Builder (Save/Publish) |
| Duplicate Form | `POST` | `/organizations/:orgId/forms/:id/duplicate` | Listing Page |

> **Note**: Delete Form endpoint is not listed in the API docs. Confirm with backend if `DELETE /organizations/:orgId/forms/:id` exists or if forms should only be set to "expired" status via PATCH.

## 2.2 Templates (Admin — Authenticated)

| Action | Method | Endpoint | Used In |
| :--- | :--- | :--- | :--- |
| List Templates | `GET` | `/form-templates` | Create Page (Step 2) |

## 2.3 Responses (Admin — Authenticated)

| Action | Method | Endpoint | Used In |
| :--- | :--- | :--- | :--- |
| List Responses | `GET` | `/organizations/:orgId/forms/:id/responses` | Responses Page |
| Update Status | `PATCH` | `/responses/:id` | Responses Page |

## 2.4 Public Form (Unauthenticated)

| Action | Method | Endpoint | Used In |
| :--- | :--- | :--- | :--- |
| Get Form Config | `GET` | `/public/forms/:slug` | Public Form Page |
| Submit Form | `POST` | `/public/forms/:slug/submit` | Public Form Page |

---

# 3. New Files to Create

```
src/
├── hooks/
│   └── use-forms.ts          ← All React Query hooks for Forms module
├── types/
│   └── form.ts               ← Update existing types to match API response
```

---

# 4. Hook Definitions (`use-forms.ts`)

Follow the exact pattern used in `use-branches.ts`:
- `useAuthStore` for `orgId`
- `apiGet`, `apiPost`, `apiPatch` from `@/lib/api`
- `useQuery` for reads, `useMutation` for writes
- `invalidateQueries` on mutation success

## 4.1 `useForms` — List Forms (Paginated)

```ts
function useForms(page: number, limit: number, search?: string, status?: string)
```

- **API**: `GET /organizations/:orgId/forms?page=&limit=&search=&status=`
- **Query Key**: `["forms", { orgId, page, limit, search, status }]`
- **Returns**: `PaginatedResponse<Form>`
- **Used by**: `organization/forms/page.tsx`

## 4.2 `useCreateForm` — Create Form

```ts
function useCreateForm()
```

- **API**: `POST /organizations/:orgId/forms`
- **Body**: `{ name: string, campaignId?: string }`
- **On Success**: Invalidate `["forms"]`, redirect to builder
- **Used by**: `organization/forms/create/page.tsx`

## 4.3 `useUpdateForm` — Update Form (Fields, Name, Status)

```ts
function useUpdateForm()
```

- **API**: `PATCH /organizations/:orgId/forms/:id`
- **Body**: `{ name?, fields?, status? }`
- **On Success**: Invalidate `["forms"]` and `["form", id]`
- **Used by**: `organization/forms/[id]/edit/page.tsx` (Save Draft, Publish)

> **CRITICAL**: This single endpoint replaces THREE mock store actions:
> - `updateForm(id, { name })` → rename
> - `updateForm(id, { fields })` → save builder state
> - `updateForm(id, { status: "active" })` → publish

## 4.4 `useDuplicateForm` — Duplicate Form

```ts
function useDuplicateForm()
```

- **API**: `POST /organizations/:orgId/forms/:id/duplicate`
- **On Success**: Invalidate `["forms"]`, toast success
- **Used by**: `organization/forms/page.tsx` (action menu)

## 4.5 `useFormTemplates` — List Templates

```ts
function useFormTemplates()
```

- **API**: `GET /form-templates`
- **Query Key**: `["form-templates"]`
- **Returns**: `Template[]`
- **Used by**: `organization/forms/create/page.tsx` (Step 2)

## 4.6 `useFormResponses` — List Responses for a Form

```ts
function useFormResponses(formId: string, page: number, limit: number, status?: string)
```

- **API**: `GET /organizations/:orgId/forms/:formId/responses?page=&limit=&status=`
- **Query Key**: `["form-responses", { orgId, formId, page, limit, status }]`
- **Returns**: `PaginatedResponse<FormResponse>`
- **Used by**: `organization/forms/[id]/responses/page.tsx`

## 4.7 `useUpdateResponseStatus` — Update Response Status

```ts
function useUpdateResponseStatus()
```

- **API**: `PATCH /responses/:id`
- **Body**: `{ status: "verified" | "pending" | "rejected" }`
- **On Success**: Invalidate `["form-responses"]`
- **Used by**: `organization/forms/[id]/responses/page.tsx`

## 4.8 `usePublicForm` — Get Public Form (No Auth)

```ts
function usePublicForm(slug: string)
```

- **API**: `GET /public/forms/:slug`
- **Query Key**: `["public-form", slug]`
- **Note**: Must NOT attach auth token (public endpoint)
- **Used by**: Public form page (`/f/[slug]`)

## 4.9 `useSubmitPublicForm` — Submit Public Form (No Auth)

```ts
function useSubmitPublicForm()
```

- **API**: `POST /public/forms/:slug/submit`
- **Body**: `{ data: Record<string, any>, utmData?: object, source?: string }`
- **Note**: Must NOT attach auth token (public endpoint)
- **Used by**: Public form page (`/f/[slug]`)

---

# 5. Type Updates (`types/form.ts`)

Update existing types to match actual API response shape:

```ts
export type FieldType =
  | 'text' | 'email' | 'phone' | 'number' | 'date'
  | 'select' | 'checkbox' | 'radio' | 'file' | 'payment'
  | 'textarea';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface Form {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'expired';
  campaignId?: string | null;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  fields: FormField[];
}

export interface FormResponse {
  id: string;
  formId: string;
  data: Record<string, any>;   // key = fieldId
  status: 'verified' | 'pending' | 'rejected';
  isDuplicate: boolean;
  submittedAt: string;
  utmData?: Record<string, string>;
}

// Input DTOs (for mutations)
export interface CreateFormInput {
  name: string;
  campaignId?: string;
}

export interface UpdateFormInput {
  name?: string;
  fields?: FormField[];
  status?: 'draft' | 'active' | 'expired';
}

export interface SubmitFormInput {
  data: Record<string, any>;
  utmData?: Record<string, string>;
  source?: string;
}
```

> **IMPORTANT**: Rename the existing `Response` type to `FormResponse` to avoid collision with the native `Response` type.

---

# 6. Page-by-Page Migration

## 6.1 Forms Listing (`organization/forms/page.tsx`)

| Current (Mock) | Target (API) |
| :--- | :--- |
| `useFormStore().forms` | `useForms(page, limit, search, status)` |
| `useFormStore().duplicateForm(id)` | `useDuplicateForm().mutate(id)` |
| `useFormStore().deleteForm(id)` | `useUpdateForm().mutate({ id, status: 'expired' })` or confirm DELETE endpoint |
| Stats computed from `forms` array | Stats from `pagination.total` + filtered counts |

### Changes Required:
1. Remove `useFormStore` import
2. Add `useForms`, `useDuplicateForm` hooks
3. Add loading/error states (skeleton, error banner)
4. Add server-side pagination controls
5. Move search/filter to query params (debounced)

---

## 6.2 Create Form (`organization/forms/create/page.tsx`)

| Current (Mock) | Target (API) |
| :--- | :--- |
| `useFormStore().addForm(form)` | `useCreateForm().mutate({ name })` |
| `useFormStore().templates` | `useFormTemplates().data` |
| `useFormStore().updateForm(id, { fields })` | `useUpdateForm().mutate({ id, fields })` |

### Changes Required:
1. **Step 1** (Create): Call `useCreateForm`, get back `{ id, slug }` from response
2. **Step 2** (Template): Fetch templates via `useFormTemplates`
3. On template select: Call `useUpdateForm` to assign fields, then redirect to builder
4. Handle loading states during creation

---

## 6.3 Form Builder (`organization/forms/[id]/edit/page.tsx`)

| Current (Mock) | Target (API) |
| :--- | :--- |
| `useFormStore().forms.find(f => f.id === id)` | `useForm(id)` (single form query) or from list cache |
| `useFormStore().updateForm(id, { fields })` | `useUpdateForm().mutate({ id, fields })` |
| `useFormStore().updateForm(id, { status })` | `useUpdateForm().mutate({ id, status })` |
| `useFormStore().updateForm(id, { name })` | `useUpdateForm().mutate({ id, name })` |

### Changes Required:
1. Load form data via API on mount (need a `useForm(id)` single-fetch hook or use cache)
2. Keep **local state** for builder canvas (fields array) — do NOT call API on every drag/add
3. On "Save Draft" → call `useUpdateForm` with full fields array
4. On "Publish" → call `useUpdateForm` with `{ fields, status: 'active' }`
5. Add loading state for initial load
6. Add saving indicator (disable buttons during mutation)
7. Handle "Form not found" from API 404

### Builder State Strategy:
```
API Load → Local State (editing) → API Save (on button click)
```
**Do NOT** call the API on every field add/remove/reorder. Batch changes and save on explicit user action.

---

## 6.4 Responses Page (`organization/forms/[id]/responses/page.tsx`)

| Current (Mock) | Target (API) |
| :--- | :--- |
| `useFormStore().responses.filter(r => r.formId === id)` | `useFormResponses(id, page, limit, status)` |
| `useFormStore().updateResponseStatus(id, status)` | `useUpdateResponseStatus().mutate({ id, status })` |
| `useFormStore().forms.find(f => f.id === id)` | Included in responses query or separate `useForm(id)` |

### Changes Required:
1. Replace mock store with `useFormResponses` hook
2. Add server-side pagination
3. Add status filter via query param
4. Handle loading/empty/error states
5. On status update → invalidate responses query

---

## 6.5 Public Form Page (`/f/[slug]/page.tsx`) — NEW

This page does not exist yet. Must be created from scratch.

### Implementation:
1. Route: `src/app/f/[slug]/page.tsx`
2. On mount: call `usePublicForm(slug)`
3. Status handling:
   - `draft` → show "Form not available" message
   - `active` → render form dynamically
   - `expired` → show "Form has expired" message
4. Render fields dynamically based on `field.type`
5. On submit: call `useSubmitPublicForm` with `{ data, utmData, source }`
6. UTM capture from URL query params
7. Show success message (never show duplicate error to user)

### Public API Client:
The public endpoints (`/public/*`) must NOT attach the auth token. Options:
- Create a separate axios instance without the auth interceptor
- Or use raw `fetch()` for public calls
- Or add a flag to skip auth in the existing interceptor

---

# 7. Migration Order (Recommended)

Execute in this order to minimize breakage:

| Step | Task | Depends On |
| :--- | :--- | :--- |
| **1** | Update `types/form.ts` with final types | Nothing |
| **2** | Create `hooks/use-forms.ts` with all hooks | Step 1 |
| **3** | Migrate **Forms Listing** page | Step 2 |
| **4** | Migrate **Create Form** flow | Step 2 |
| **5** | Migrate **Form Builder** page | Step 2 |
| **6** | Migrate **Responses** page | Step 2 |
| **7** | Build **Public Form** page (new) | Step 2 |
| **8** | Remove `mockStore.ts` | Steps 3–7 complete |

---

# 8. Single Form Fetch (Missing from API Docs)

The builder (`/organization/forms/[id]/edit`) needs to load a **single form by ID**. The API docs only show the list endpoint. Two options:

### Option A: Add `useForm(id)` hook
If backend supports `GET /organizations/:orgId/forms/:id`:
```ts
function useForm(id: string) {
  return useQuery({
    queryKey: ["form", id],
    queryFn: () => apiGet<Form>(`/organizations/${orgId}/forms/${id}`),
  });
}
```

### Option B: Use list cache
Extract form from the `useForms` query cache. **Not recommended** — breaks if user navigates directly to builder URL.

> **Action Required**: Confirm with backend team if `GET /organizations/:orgId/forms/:id` exists.

---

# 9. Delete Form (Missing from API Docs)

The listing page has a "Delete" action. The API docs don't list a `DELETE /organizations/:orgId/forms/:id` endpoint.

### Options:
- **Soft delete**: Use `PATCH` to set `status: 'expired'` (safest)
- **Hard delete**: Confirm if `DELETE` endpoint exists

> **Action Required**: Confirm delete strategy with backend.

---

# 10. Key Differences from Mock Store

| Behavior | Mock Store | API |
| :--- | :--- | :--- |
| Form ID generation | Client-side (`Math.random()`) | Server-side (UUID) |
| Slug generation | Not implemented | Server-side (from name) |
| Duplicate detection | Client-side JSON compare | Server-side (email/phone) |
| Template assignment | Direct field copy | Create form → PATCH with template fields |
| Field ID generation | Client-side | Client-side (stable IDs, server stores as-is) |
| Pagination | None (all in memory) | Server-side with `page`, `limit`, `total` |

---

# 11. Error & Loading States

Every page migration must add:

| State | UI |
| :--- | :--- |
| **Loading** | Skeleton/spinner (never blank page) |
| **Empty** | "No forms yet" illustration + CTA |
| **Error** | Error banner with retry button |
| **Saving** | Disabled buttons + spinner icon |
| **Optimistic** | Not needed for Phase 1 (keep simple) |

---

# 12. What NOT to Do

- ❌ Do NOT call API on every builder interaction (drag, add field) — batch on save
- ❌ Do NOT keep `mockStore.ts` as fallback — clean break
- ❌ Do NOT implement client-side duplicate detection — backend handles it
- ❌ Do NOT generate form IDs or slugs on the client — server is source of truth
- ❌ Do NOT try to implement optimistic updates in Phase 1

---

# 13. Checklist Before Starting

- [ ] Confirm `GET /organizations/:orgId/forms/:id` exists (single form fetch)
- [ ] Confirm delete form strategy (soft delete via PATCH or hard DELETE)
- [ ] Confirm public API requires separate client without auth header
- [ ] Confirm `slug` is returned in the create form response
- [ ] Confirm field `type` values match between frontend and backend
- [ ] Backend is running and seeded with test data

---

# 14. Final Outcome

After completing this plan:

- ✅ All form data comes from the real backend
- ✅ `mockStore.ts` is fully removed
- ✅ React Query provides caching, refetching, and loading states
- ✅ Public form submission flows through the real ingestion pipeline
- ✅ Pagination is server-driven
- ✅ Code follows the same pattern as `use-branches.ts`

---

**Do NOT start coding until the checklist in Section 13 is confirmed.**
