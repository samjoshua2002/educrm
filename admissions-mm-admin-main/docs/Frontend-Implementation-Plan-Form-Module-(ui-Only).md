# Frontend Implementation Plan — Form Module (UI First, Production-Aligned)

> Goal: Build a **fully working UI prototype** aligned with real production behavior, including public form usage, without API integration.

---

# 1. Core Principles

* No API calls (use local mock store)
* UI must reflect **real-world system behavior**
* Structure must be API-ready (no future rewrite)
* Cover **complete flow** (Admin → Public User → Submission → Responses)

---

# 2. Global State Strategy (Temporary)

Use centralized store (`mockStore.ts`)

```ts
{ 
  forms: Form[];
  templates: Template[];
  responses: Record<formId, Response[]>;
}
```

---

# 3. Type Definitions (FINAL)

## 3.1 Form

```ts
interface Form {
  id: string;
  name: string;
  slug: string; // for public URL
  status: 'draft' | 'active' | 'expired';
  campaignId?: string | null;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 3.2 Field

```ts
interface FormField {
  id: string; // CRITICAL: stable ID
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}
```

---

## 3.3 Template

```ts
interface Template {
  id: string;
  name: string;
  fields: FormField[];
}
```

---

## 3.4 Response (IMPORTANT CHANGE)

```ts
interface Response {
  id: string;
  formId: string;

  // key = fieldId (NOT label)
  data: Record<string, any>;

  status: 'verified' | 'pending' | 'rejected';
  isDuplicate: boolean;

  submittedAt: string;

  // future ready
  utm?: {
    source?: string;
    campaign?: string;
  };
}
```

---

# 4. Complete Flow (System-Level)

```text
Admin → Create Form → Build → Publish →
Generate Public URL →
User Opens Form →
Submits →
Duplicate Check →
Store Response →
Mark Duplicate if needed →
View in Responses
```

---

# 5. Pages Implementation Plan

---

# 5.1 Forms Listing Page

## Features

* List forms from store
* Search + status filter
* Campaign column (optional)
* Actions: Edit / Duplicate / Delete

## Enhancements

* Show campaign badge or "—"
* Response count from mock data

---

# 5.2 Create Form Flow

## Step 1: Create Form

Inputs:

* Form Name (required)
* Campaign (optional)

On submit:

* Create form
* Generate slug:

```ts
slug = name.toLowerCase().replace(/\s+/g, "-")
```

---

## Step 2: Template Selection

* Load templates
* Assign fields
* Redirect to builder

---

# 5.3 Form Builder

## Layout

```
Field Library | Canvas | Field Settings
```

---

## Header

* Editable form name
* Status badge
* Buttons:

  * Save Draft
  * Publish
  * Preview
  * Copy Link (NEW)
  * Open Form (NEW)

---

## Copy Link Logic

```ts
url = `/f/${form.slug}`
```

---

## MUST Features

* Add field
* Delete field
* Duplicate field
* Options editor
* Drag reorder

---

## Settings Tab (NEW - REQUIRED)

* Campaign (readonly)
* Status control
* Start / End date (UI only)
* Redirect URL
* Success message
* CAPTCHA toggle (UI only)

---

# 5.4 Public Form Page (NEW — CRITICAL)

Route:

```ts
/f/[slug]
```

---

## Behavior

### Load form by slug

### Status Handling

| Status  | Behavior             |
| ------- | -------------------- |
| draft   | Not accessible       |
| active  | Show form            |
| expired | Show expired message |

---

## Render Form Dynamically

* Loop fields
* Render based on type

---

## Submission Logic (UI Simulation)

### Step 1: Extract email (or fallback)

```ts
emailField = find(field.type === "email")
phoneField = find(field.type === "phone")

uniqueKey = email || phone
```

---

### Step 2: Duplicate Check

```ts
if (same uniqueKey && same formId) {
  isDuplicate = true;
}
```

---

### Step 3: Store Response

```ts
response = {
  id,
  formId,
  data: {
    [fieldId]: value
  },
  isDuplicate,
  status: "pending"
}
```

---

### Step 4: UX Feedback

👉 Always show:

"Submission successful"

(no duplicate error)

---

## UTM Capture (Simulated)

```ts
const params = new URLSearchParams(window.location.search)

utm = {
  source: params.get("utm_source"),
  campaign: params.get("utm_campaign")
}
```

---

# 5.5 Responses Page

## Features

* Load responses
* Search/filter
* Pagination

---

## Dynamic Columns

Generate from:

```ts
form.fields
```

---

## Mapping

```ts
fieldId → label
```

---

## Row Click

* Open sheet panel
* Show full data

---

## Actions

* Verify
* Reject

---

# 6. Duplicate Handling Strategy

Rule:

```text
Same uniqueKey + same form → insert + mark duplicate
```

---

# 7. Campaign Handling

## UI

* Show badge if exists
* Otherwise "—"

## Behavior

* Optional (non-blocking)
* Future-ready for analytics

---

# 8. Form Status Rules

| Status  | Submission |
| ------- | ---------- |
| draft   | ❌ blocked  |
| active  | ✅ allowed  |
| expired | ❌ blocked  |

---

# 9. File Structure

```
/forms
  ├── page.tsx
  ├── create/
  ├── [id]/edit/
  ├── [id]/responses/

/public-form
  ├── [slug]/page.tsx   ← NEW

/store
  ├── mockStore.ts

/types
  ├── form.ts

/components
  ├── form-builder/
  ├── public-form/
  ├── response-table/
```

---

# 10. What NOT to Do Now

❌ API integration
❌ Advanced validation
❌ Analytics dashboard
❌ Autosave

---

# 11. Final Goal

After this phase:

* Full admin flow works
* Public form works
* Duplicate logic works
* Data structure is stable
* Ready for backend integration

---

# 12. Reality Check

If you follow this:

✅ No major rewrite later
✅ Backend integration becomes plug-and-play
✅ Real-world usage is already covered

If you skip public form or field IDs:

❌ System will break at scale
❌ You will rewrite responses logic

---

# 13. Final System Strength

* Real-world ready flow
* Public usage supported
* Stable data structure (field IDs)
* Duplicate-safe logic
* Campaign-ready (optional)

---

**This is now production-aligned — not just UI.**
