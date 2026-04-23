---
description: Patterns for maintaining UI consistency in Form and List pages.
---

# 🎨 UI Consistency Workflow

Follow these patterns strictly for every page to ensure a premium, unified SaaS experience.

## 1. List / Index Pages

Every listing page must follow the structure used in `lead-manager/page.tsx`.

### Header Section
- **Sticky Header**: `sticky top-12 z-10 bg-background/40 backdrop-blur-md border-b`.
- **Layout**: `flex items-center justify-between px-4 md:px-6 py-3`.
- **Title**: `h1.text-xl.font-semibold`.
- **Primary Action**: "Add [Resource]" button linking to the create page.

### Filter & Search Section
- **Search Field**: `Input` with `Search` icon button.
- **Quick Filters**: `Select` components for status/stage.
- **Advanced Filters**: `SlidersHorizontal` icon button triggering a `Dialog`.
- **Pagination**: Consistent bottom bar showing "Showing X-Y of Z" and page buttons.

### Table Section
- **Container**: `overflow-hidden rounded-lg border`.
- **Header**: `TableHeader.bg-muted`.
- **Badges**: Use `Badge` for status/stage with semantic colors (e.g., `statusStyles`).
- **Actions**: `DropdownMenu` with `EllipsisVertical` trigger on the right-most cell.

---

## 2. Form (Create/Edit) Pages

Every form page must handle both **Create** and **Edit** modes in a single file, following `lead-manager/create/page.tsx`.

### Unified Page Pattern
- **Route**: Use `[id]/page.tsx` or handle both via standard Next.js patterns.
- **Modes**: Determine `isEdit` mode based on existence of data/params.
- **Dynamic Title**: "Add [Resource]" vs "Edit [Resource]" in the header.

### Layout (12-Column Grid)
- **Container**: `grid grid-cols-1 lg:grid-cols-12 gap-4 items-start`.
- **Left Column (`lg:col-span-8`)**:
  - Contains one or more `Card` components for primary data.
  - Use `Separator` and small descriptive labels for sections.
- **Right Column (`lg:col-span-4`)**:
  - Contains CRM, Status, and Action buttons.
  - Action buttons: "Save [Resource]" (primary) and "Cancel" (outline).

### Data Handling
- **Pre-filling**: If `isEdit` is true, fetch data on mount and populate the `form` state.
- **ISO Dates**: Always convert date fields to `.toISOString()` before API submission.
- **Submitting**: Change API method based on mode (`POST` for Create, `PATCH/PUT` for Edit).

---

## 3. Implementation Workflow

1. **Plan API**: Define endpoints and data structure first.
2. **Draft UI**: Apply the 12-column grid to forms and the sticky-header table to lists.
3. **Connect API**: Use React Query for fetching and mutations.
4. **Invalidate**: Always `invalidateQueries` after a save to keep the list page fresh.