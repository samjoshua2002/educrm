# Copy API Functionality and Add Lead Verification

The goal is to copy implemented API functionalities (primarily for Leads listing and Superadmin Organization Staff management) from `admissions-mm-admin` to `admissions-mm-admin-main`, modify the backend to support lead verification, and update the frontend `/lead-manager` (unverified leads) and `/leads` (verified leads) screens.

## User Review Required

> [!IMPORTANT]
>
> - **Database Schema Migration:** The backend `leads` table and NestJS `Lead` entity will be updated with a new `status` column (`'unverified' | 'verified' | 'disqualified'`) defaulting to `'unverified'`. A SQL migration/update query must be run on the database.
> - **Signature Polymorphism:** The hooks `useTeam` and `useBranches` in `admissions-mm-admin-main` will be updated to support an optional `explicitOrgId` parameter while maintaining backward compatibility with existing calls.
> - **Mandatory Form System Fields:** Every form (create, edit, template, duplicate) must always include four locked system fields. The `location` field submits a branch UUID and is persisted on `leads.branch_id`.

## Proposed Changes

### Form Builder — Mandatory Default Fields (Frontend + Backend)

Every organization form must always include these four system fields at the top of the schema. They cannot be edited, reordered away from the locked set, or deleted in the form builder UI.

| Field ID    | Type   | Label     | Required | Maps to (leads)                                                      |
| ----------- | ------ | --------- | -------- | -------------------------------------------------------------------- |
| `full_name` | text   | Full Name | Yes      | `first_name` (+ optional `last_name` split)                          |
| `phone`     | phone  | Phone     | Yes      | `phone`                                                              |
| `location`  | select | Location  | Yes      | `branch_id` (options loaded from org branches at render/submit time) |
| `email`     | email  | Email     | No       | `email`                                                              |

#### [NEW] [default-form-fields.ts](file:///C:/WebMaddyProjects/educrm/admissions-mm-admin-main/src/lib/default-form-fields.ts)

Shared constants and `ensureDefaultFormFields()` used by create/edit pages before save and on load.

#### [NEW] [form-default-fields.ts](file:///C:/WebMaddyProjects/educrm/admissions-tenant-api-main/src/modules/forms/form-default-fields.ts)

Server-side `mergeDefaultFormFields()` — enforces defaults on create, update, duplicate, and read so API clients cannot strip system fields.

#### [MODIFY] [forms.service.ts](file:///C:/WebMaddyProjects/educrm/admissions-tenant-api-main/src/modules/forms/forms.service.ts)

- On `create`, `update`, `duplicate`, and `findOne` / `findBySlug`: merge default fields.
- `location` select options are validated against `organization.branches` on public submit (existing `lead-ingestion.service` logic).

#### [MODIFY] [lead-ingestion.service.ts](file:///C:/WebMaddyProjects/educrm/admissions-tenant-api-main/src/modules/leads/lead-ingestion.service.ts)

- `dto.data.location` → `lead.branchId`
- `dto.data.full_name` → `lead.firstName` (and `lastName` when name contains a space)

#### [MODIFY] Form create & edit pages

- Import shared defaults; block delete/duplicate/edit of `systemField` rows.
- Public form `/f/[slug]`: `location` dropdown populated from `organization.branches` (branch UUID as value).

---

### Backend (admissions-tenant-api-main)

#### [MODIFY] [Database.sql](file:///C:/WebMaddyProjects/educrm/admissions-tenant-api-main/Database.sql)

Update the `leads` table creation script to include the `status` column:

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'unverified';
```

#### [MODIFY] [lead.entity.ts](file:///C:/WebMaddyProjects/educrm/admissions-tenant-api-main/src/modules/leads/entities/lead.entity.ts)

Add the `status` field to the `Lead` class:

```typescript
@Column({ length: 50, default: 'unverified' })
status: string; // 'unverified' | 'verified' | 'disqualified'
```

#### [MODIFY] [leads.service.ts](file:///C:/WebMaddyProjects/educrm/admissions-tenant-api-main/src/modules/leads/leads.service.ts)

Update `findAll` to filter by `status` if provided:

```typescript
async findAll(orgId: string, paginationDto: PaginationDto, search?: string, status?: string) {
  const query = this.leadRepository.createQueryBuilder('lead')
    .where('lead.organization_id = :orgId', { orgId });

  if (status) {
    query.andWhere('lead.status = :status', { status });
  }
  // Search filtering logic remains...
}
```

Add a method `updateStatus` to update the verification status of a lead:

```typescript
async updateStatus(id: string, orgId: string, status: string): Promise<Lead> {
  const lead = await this.findOne(id, orgId);
  lead.status = status;
  return this.leadRepository.save(lead);
}
```

#### [MODIFY] [leads.controller.ts](file:///C:/WebMaddyProjects/educrm/admissions-tenant-api-main/src/modules/leads/leads.controller.ts)

- Expose the query param `status` in `findAll`.
- Add a new route `PATCH :id/status` to update lead verification status:

```typescript
@Patch(':id/status')
@Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
@ResponseMessage('Lead status updated successfully')
updateStatus(
  @Param('orgId', ParseUUIDPipe) orgId: string,
  @Param('id', ParseUUIDPipe) id: string,
  @Body('status') status: string,
) {
  return this.leadsService.updateStatus(id, orgId, status);
}
```

---

### Frontend (admissions-mm-admin-main)

#### [NEW] [use-leads.ts](file:///C:/WebMaddyProjects/educrm/admissions-mm-admin-main/src/hooks/use-leads.ts)

Create the lead hooks containing:

- `useLeads(page, limit, search, explicitOrgId, status)`: Query hook supporting pagination, search, explicit organisation ID, and status filters.
- `useDeleteLead()`: Mutation to delete a lead.
- `useUpdateLeadStatus()`: Mutation to verify/disqualify a lead:

```typescript
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) =>
      apiPatch(`/organizations/${orgId}/leads/${leadId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead status updated successfully");
    },
  });
}
```

#### [MODIFY] [use-team.ts](file:///C:/WebMaddyProjects/educrm/admissions-mm-admin-main/src/hooks/use-team.ts)

Modify `useTeam` and related hooks to support `explicitOrgId` query filtering polymorphically:

```typescript
export function useTeam(pageOrOrgId?: number | string, limit: number = 10) {
  const currentUser = useAuthStore((state) => state.user);
  let page = 1;
  let orgId = currentUser?.organizationId;

  if (typeof pageOrOrgId === "string") {
    orgId = pageOrOrgId;
  } else if (typeof pageOrOrgId === "number") {
    page = pageOrOrgId;
  }

  return useQuery({
    queryKey: ["team", { orgId, page, limit }],
    queryFn: () =>
      apiGet<PaginatedResponse<User>>(`/organizations/${orgId}/users`, {
        page,
        limit,
      }),
    enabled: !!orgId,
  });
}
```

#### [MODIFY] [use-branches.ts](file:///C:/WebMaddyProjects/educrm/admissions-mm-admin-main/src/hooks/use-branches.ts)

Update `useBranches` to support polymorphically passing an explicit organization ID.

#### [MODIFY] [lead-manager page.tsx](<file:///C:/WebMaddyProjects/educrm/admissions-mm-admin-main/src/app/(main)/lead-manager/page.tsx>)

Replace mock data usage with the backend `useLeads` integration filtering by `status: 'unverified'`.

- Display new/unverified leads.
- In the table list and sheet actions, add "Verify" and "Disqualify" buttons calling `useUpdateLeadStatus()`.

#### [MODIFY] [leads page.tsx](file:///C:/WebMaddyProjects/educrm/admissions-mm-admin-main/src/app/organization/leads/page.tsx)

Replace the simple placeholder with the rich, interactive view from `(main)/lead-manager/page.tsx`.

- Connect it to the backend `useLeads` hook filtering by `status: 'verified'`.
- Keep the new styling, graphs/funnels, edit/delete modals, and filter structure intact.

#### [NEW] [users page.tsx](file:///C:/WebMaddyProjects/educrm/admissions-mm-admin-main/src/app/superadmin/organizations/[orgId]/users/page.tsx)

Copy the organization staff management page from `admissions-mm-admin`.

#### [MODIFY] [organizations page.tsx](file:///C:/WebMaddyProjects/educrm/admissions-mm-admin-main/src/app/superadmin/organizations/page.tsx)

Add the "Manage Users" option to the Actions dropdown menu of each organization row, linking to the newly created staff management route.

## Verification Plan

### Automated Tests

- Build check: Run `npm run build` or Next.js build validation on the frontend and backend to ensure all TypeScript and imports resolve correctly.

### Manual Verification

- Create a new form (blank and from template) — confirm Full Name, Phone, Location, and Email appear and cannot be deleted or edited.
- Publish form, submit via `/f/:slug` — select a branch in Location; confirm `leads.branch_id` matches the selected branch UUID.
- Verify unverified leads on `/lead-manager` and verified leads on `/organization/leads` after using Verify action.
