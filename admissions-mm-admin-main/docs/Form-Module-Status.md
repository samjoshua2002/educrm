# Form Module — Current Status & Architecture

> **Last Updated**: March 30, 2026  
> **Module Path**: `/organization/forms`  
> **Stage**: 🟡 **UI Prototype — Static Data, No API Integration**

---

## 1. Module Overview

The Form Management module allows Organization Admins to create, manage, and collect responses from admission-related forms. It follows a multi-step workflow: **List → Template Selection → Builder → Publish → Collect Responses**.

### Route Map

| Route | Page | File |
|---|---|---|
| `/organization/forms` | Form Listing | `src/app/organization/forms/page.tsx` |
| `/organization/forms/create` | Template Selector | `src/app/organization/forms/create/page.tsx` |
| `/organization/forms/[id]/edit` | Drag-and-Drop Form Builder | `src/app/organization/forms/[id]/edit/page.tsx` |
| `/organization/forms/[id]/responses` | Submission Responses Table | `src/app/organization/forms/[id]/responses/page.tsx` |

---

## 2. Current Data Source

> [!WARNING]
> **All data on every page is hardcoded / static.** There is no API integration, no React Query hooks, and no backend persistence. All state lives in component-level `useState` and is lost on navigation or refresh.

### Hardcoded Data Inventory

#### Forms Listing Page (`page.tsx`)
```typescript
const forms = [
  { id: "1", name: "UG Admission Application 2024", status: "Active", responses: 1240, conversion: "18.5%", lastModified: "2024-03-15" },
  { id: "2", name: "Scholarship Inquiry Form",     status: "Active", responses: 850,  conversion: "22.1%", lastModified: "2024-03-14" },
  { id: "3", name: "International Student Profile", status: "Draft",  responses: 0,    conversion: "0%",    lastModified: "2024-03-10" },
  { id: "4", name: "Engineering Entrance Exam Registration", status: "Expired", responses: 3200, conversion: "45.2%", lastModified: "2024-03-01" },
];
```

#### Template Selector (`create/page.tsx`)
```typescript
const templates = [
  { title: "Blank Form",            id: "blank",          color: "bg-muted text-muted-foreground" },
  { title: "UG Admission Form",     id: "ug-application", color: "bg-blue-100 text-blue-600 ..." },
  { title: "Scholarship Inquiry",   id: "scholarship",    color: "bg-emerald-100 text-emerald-600 ..." },
  { title: "International Student",  id: "international",  color: "bg-purple-100 text-purple-600 ..." },
];
```

#### Form Builder (`[id]/edit/page.tsx`)
```typescript
// Default fields (loaded on mount, not from API)
const defaultFields = [
  { id: "1", type: "text",  label: "Full Name",      placeholder: "Enter your full name", required: true },
  { id: "2", type: "email", label: "Email Address",   placeholder: "you@example.com",      required: true },
];
```

#### Stats Cards (Listing Page)
```
Total Active Forms  → 12       (hardcoded)
Total Responses     → 5,290    (hardcoded)
Avg. Conversion     → 24.8%    (hardcoded)
```

#### Responses Page (`[id]/responses/page.tsx`)
```typescript
const mockResponses = [
  { id: "REP001", applicant: "Arjun Sharma",  email: "arjun.s@example.com",  course: "B.Tech Computer Science", status: "Verified" },
  { id: "REP002", applicant: "Priya Patel",   email: "priya.p@example.com",  course: "B.Arch",                  status: "Pending"  },
  { id: "REP003", applicant: "Sneha Reddy",   email: "sneha.r@example.com",  course: "MBA Marketing",           status: "Rejected" },
  { id: "REP004", applicant: "Kabir Singh",   email: "kabir.v@example.com",  course: "B.Tech Mechanical",       status: "Verified" },
];
```

---

## 3. UI Components & Design Patterns Used

### 3.1 Design System Components (from `@/components/ui/`)

| Component | Used In | Purpose |
|---|---|---|
| `Button` | All pages | Primary actions, ghost/outline variants |
| `Input` | All pages | Search bars, field configuration inputs |
| `Table` / `TableHeader` / `TableRow` / `TableCell` | Listing, Responses | Data tables with muted header row |
| `Badge` | Listing, Responses | Status badges (Active/Draft/Expired/Verified/Pending/Rejected) |
| `Card` / `CardContent` / `CardHeader` / `CardTitle` | Listing, Create, Builder | Stat cards, template cards, canvas card |
| `DropdownMenu` / `DropdownMenuItem` | Listing, Builder, Responses | Action menus (three-dot) and save dropdown |
| `Tabs` / `TabsList` / `TabsTrigger` | Builder | Build / Styling / Logic / Settings tabs |
| `Switch` | Builder | Required field toggle |
| `Label` | Builder | Field configuration labels |
| `Separator` | Builder, Responses | Visual section dividers |
| `ScrollArea` | Builder | Right sidebar scroll container |
| `Sheet` / `SheetContent` / `SheetHeader` | Responses | Slide-out response detail panel |

### 3.2 Third-Party Libraries

| Library | Used In | Purpose |
|---|---|---|
| `@dnd-kit/core` | Builder | Drag-and-drop context, sensors, collision detection |
| `@dnd-kit/sortable` | Builder | Sortable list strategy for field reordering |
| `@dnd-kit/utilities` | Builder | CSS transform utilities for drag animations |
| `lucide-react` | All pages | Icon library (20+ icons used) |

### 3.3 Design Patterns

| Pattern | Description |
|---|---|
| **Sticky Glassmorphism Header** | `sticky top-12 z-10 bg-background/40 backdrop-blur-md` — consistent across all pages |
| **Stats Grid** | 3-column card grid with icon, value, and delta text |
| **Group Hover Effects** | Table rows use `group cursor-pointer` with icon color transitions on hover |
| **Conversion Mini-Bar** | Inline progress bar `w-12 h-1 bg-muted` with `bg-primary` fill width |
| **Builder 3-Panel Layout** | Left sidebar (272px) + Center canvas (flex-1) + Right sidebar (320px) |
| **Empty State** | Dashed-border centered placeholder with icon and instructional text |
| **Sheet Detail Panel** | Right slide-out panel for viewing full submission detail without navigation |
| **Avatar Initials** | Round initials badge derived from full name (`split(" ").map(n => n[0]).join("")`) |

---

## 4. Type System & Variables Available

### 4.1 Field Types (Builder)
```typescript
type FieldType =
  | "text" | "email" | "phone" | "number" | "date"
  | "select" | "checkbox" | "radio" | "file" | "payment";
```

### 4.2 Form Field Interface
```typescript
interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];   // for select, radio, checkbox — NOT YET IMPLEMENTED in UI
}
```

### 4.3 Field Library (Left Sidebar Items)
```typescript
const FIELD_LIBRARY = [
  { type: "text",     label: "Short Text",      icon: Type },
  { type: "email",    label: "Email Address",    icon: Mail },
  { type: "phone",    label: "Phone Number",     icon: Phone },
  { type: "number",   label: "Number Input",     icon: Hash },
  { type: "date",     label: "Date Picker",      icon: CalendarIcon },
  { type: "select",   label: "Dropdown Menu",    icon: ChevronDown },
  { type: "checkbox", label: "Checkboxes",       icon: CheckSquare },
  { type: "radio",    label: "Radio Buttons",    icon: Radio },
  { type: "file",     label: "File Upload",      icon: Upload },
  { type: "payment",  label: "Collexo Payment",  icon: CreditCard },
];
```

### 4.4 Status Variants

**Form Listing Statuses:**
| Status | Badge Variant | Meaning |
|---|---|---|
| `Active` | `default` (primary) | Form is published and accepting responses |
| `Draft` | `secondary` | Form is saved but not published |
| `Expired` | `destructive` | Form submission period has ended |

**Response Statuses:**
| Status | Custom Color | Meaning |
|---|---|---|
| `Verified` | `bg-green-100 text-green-700` | Documents verified, application approved |
| `Pending` | `bg-orange-100 text-orange-700` | Awaiting review |
| `Rejected` | `bg-red-100 text-red-700` | Application rejected |

### 4.5 Builder Tab States
```
Build    → Active by default. Shows field library + canvas
Styling  → 🔴 Not implemented (no content behind tab)
Logic    → 🔴 Not implemented (no content behind tab)
Settings → 🔴 Not implemented (no content behind tab)
```

---

## 5. What Currently Works (Functional)

| Feature | Status | Notes |
|---|---|---|
| Search/filter forms by name | ✅ Working | Client-side filter on static array |
| View form listing with stats | ✅ Working | Static data, no API |
| Navigate to template selector | ✅ Working | All 4 template cards link to builder |
| Add fields to canvas | ✅ Working | Click any field button in left sidebar |
| Drag-and-drop reorder fields | ✅ Working | `@dnd-kit` powered with pointer + keyboard sensors |
| Select field → edit label/placeholder | ✅ Working | Right sidebar updates field in real-time |
| Toggle required field | ✅ Working | Switch component bound to field state |
| Duplicate/Delete field actions | ✅ Visible | Delete works. Duplicate button is rendered but has **no handler**. |
| Empty canvas state | ✅ Working | Shows when all fields removed |
| View submission responses | ✅ Working | Table with mock data + search |
| Slide-out response detail | ✅ Working | Sheet panel with applicant info + documents |
| Search responses by name/email/ID | ✅ Working | Client-side filter |

---

## 6. What Does NOT Work (Gaps & Missing Features)

### 6.1 Critical Gaps

| Gap | Severity | Description |
|---|---|---|
| **No API Integration** | 🔴 Critical | No hooks (`useForms`, `useFormBuilder`). All data is static constants. |
| **No Save/Persist** | 🔴 Critical | "Save as Draft" and "Save and Publish" buttons are non-functional. Builder state is lost on page reload. |
| **No Form Creation Flow** | 🔴 Critical | Template selection doesn't pass a template ID to the builder. All templates point to the same `/new/edit` URL. |
| **No Edit Mode** | 🔴 Critical | Navigating to `/forms/[id]/edit` loads default fields, not the actual form's field schema. |
| **No Form Name Editing** | 🟡 Medium | Form title "UG Admission Form 2024" is hardcoded in the builder header. There is no input to rename it. |
| **Stats are fake** | 🟡 Medium | The 3 stat cards (Active Forms: 12, Responses: 5,290, Conversion: 24.8%) are hardcoded numbers. |

### 6.2 Builder Feature Gaps

| Feature | Status | Notes |
|---|---|---|
| Options editor for select/radio/checkbox | 🔴 Missing | `options?: string[]` exists in the type but there is **no UI to add or edit options** |
| Duplicate field handler | 🔴 Missing | Button is rendered but `onClick` is not wired |
| Field validation rules | 🔴 Missing | No min/max length, regex patterns, custom error messages |
| Conditional logic ("Show if...") | 🔴 Missing | UI placeholder exists ("Add Condition" button) but has no handler |
| Styling tab content | 🔴 Missing | Tab trigger exists but no panel content |
| Logic tab content | 🔴 Missing | Tab trigger exists but no panel content |
| Settings tab content | 🔴 Missing | Tab trigger exists but no panel content |
| Layout units ("New Section", "2-Column") | 🔴 Missing | Buttons exist but have no handlers |
| Preview mode | 🔴 Missing | "Preview" button in header has no handler |
| File upload configuration | 🔴 Missing | No settings for allowed file types, max size, etc. |
| Payment field configuration | 🔴 Missing | No integration with payment gateway (Collexo) |
| Multi-page/multi-step forms | 🔴 Missing | No concept of pages or steps |

### 6.3 Listing Page Gaps

| Feature | Status | Notes |
|---|---|---|
| Status filter dropdown | 🔴 Missing | Only search is available, no filter by Active/Draft/Expired |
| Pagination | 🔴 Missing | No pagination component or logic |
| Duplicate form action | 🟡 Stub | Menu item exists but no handler |
| Delete form action | 🟡 Stub | Menu item exists but no confirmation dialog or handler |
| Sort by column | 🔴 Missing | Table headers are not sortable |

### 6.4 Responses Page Gaps

| Feature | Status | Notes |
|---|---|---|
| Filter drawer/modal | 🔴 Missing | "Filters" button has no handler |
| Export CSV | 🔴 Missing | "Export CSV" button has no handler |
| Status quick-filter badges | 🟡 Visual only | Badges show counts but are not clickable/filterable |
| Pagination | 🔴 Missing | No pagination for large response sets |
| Verify/Reject handler | 🔴 Missing | Sheet buttons are rendered but non-functional |
| Dynamic form-specific columns | 🔴 Missing | Response table shows hardcoded columns, not the actual form's field labels |

---

## 7. Improvement Roadmap

### Phase A: API Integration & Data Layer
1. **Define `Form` TypeScript interface** — `id`, `name`, `slug`, `status`, `fields[]`, `settings`, `createdAt`, `updatedAt`, `organizationId`
2. **Create `useForms()` hook** — `GET /organizations/:orgId/forms` with React Query
3. **Create `useForm(id)` hook** — `GET /organizations/:orgId/forms/:id` to load a single form's schema
4. **Create `useCreateForm()` mutation** — `POST /organizations/:orgId/forms`
5. **Create `useUpdateForm(id)` mutation** — `PATCH /organizations/:orgId/forms/:id` (save builder state)
6. **Create `useFormResponses(formId)` hook** — `GET /organizations/:orgId/forms/:formId/responses`
7. **Wire stat cards** to aggregate API data or a dedicated stats endpoint

### Phase B: Builder Completion
1. **Options Editor UI** — When a `select`, `radio`, or `checkbox` field is selected, show an editable list of options in the right sidebar
2. **Wire Duplicate** — Clone the selected field with a new ID and insert after the current position
3. **Editable Form Title** — Replace the hardcoded `<h1>` with an inline-editable input
4. **Auto-save / Draft persistence** — Debounced `PATCH` on every field change or manual "Save" click
5. **Preview Mode** — Full-screen or modal rendering the form as an end-user would see it
6. **Section & Column Layouts** — Implement grouping logic for multi-column field arrangements

### Phase C: Advanced Features
1. **Conditional Logic Engine** — UI to define "if Field X = value Y, then show/hide Field Z"
2. **Field Validation Rules** — Min/max length, regex, custom error messages per field
3. **Styling Tab** — Theme color, font, logo upload, background image for the published form
4. **Settings Tab** — Submission limits, start/end date, redirect URL, notification emails
5. **Multi-step Forms** — Page breaks with progress indicator
6. **Payment Integration** — Configure Collexo payment amounts, currencies, and success/failure redirects
7. **File Upload Config** — Allowed MIME types, max size, required document labels

### Phase D: Response Management
1. **Dynamic Columns** — Table columns should be generated from the form's field schema
2. **Bulk Actions** — Select multiple responses, bulk verify/reject/export
3. **Advanced Filtering** — Filter by any form field, date range, status
4. **CSV/Excel Export** — Generate downloadable file from filtered response set
5. **Response Analytics** — Charts showing submissions over time, completion rates, drop-off points

---

## 8. File Size & Complexity Summary

| File | Lines | Bytes | Complexity |
|---|---|---|---|
| `forms/page.tsx` | 244 | 9.6 KB | Low — static table with search |
| `forms/create/page.tsx` | 113 | 4.5 KB | Low — static template grid |
| `forms/[id]/edit/page.tsx` | 462 | 18.4 KB | High — DnD, state management, 3-panel layout |
| `forms/[id]/responses/page.tsx` | 353 | 14.2 KB | Medium — table + sheet panel |
| **Total** | **1,172** | **46.7 KB** | — |

---

## 9. Dependencies Required

```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "lucide-react": "^0.453.0"
}
```

All are already installed in `package.json`.

---

## 10. Key Design Decisions & Constraints

1. **Template Selection is decorative** — Every template card navigates to the same `/new/edit` URL with the same default fields. There is no template-to-schema mapping.
2. **Form name is not a URL param** — The builder fetches nothing from `params.id`. It always loads the same 2 default fields.
3. **No form schema storage** — The `FormField[]` array exists only in React state. There is no serialization, no localStorage fallback, and no API persistence.
4. **Conversion bar uses CSS width** — `style={{ width: form.conversion }}` works because the value is already a percentage string like `"18.5%"`. This will break if the API returns a number instead of a string.
5. **Builder is full-bleed** — Unlike other pages that follow the 8/4 grid layout, the builder uses a custom 3-panel layout (`aside 272px | flex-1 | aside 320px`) that fills the viewport height minus the top nav.
