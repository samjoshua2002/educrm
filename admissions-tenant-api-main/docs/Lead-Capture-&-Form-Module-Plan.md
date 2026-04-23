# Lead Capture & Form Module — Final Backend Implementation Plan (Frontend-Aligned)

---

# 1. Objective

Design a **production-ready Lead Capture System** that:

* Captures leads from multiple channels
* Supports public form usage via URL
* Handles duplicates intelligently (no rejection)
* Stores all attempts for analytics
* Prevents abuse via duplicate limits & rate limiting
* Fully aligns with frontend data structure and UX

---

# 2. Core Architecture

```
External Sources (Ads / Website / Landing Page)
        ↓
Public Form (via slug)
        ↓
Lead Ingestion API
        ↓
Validation + Security
        ↓
Duplicate Detection
        ↓
Storage (form_submissions + leads)
        ↓
Assignment Engine
        ↓
Verification Pipeline
        ↓
Analytics
```

---

# 3. Final Locked Rules (CRITICAL)

### ✅ Duplicate Logic

```
Same email + same form → INSERT + mark is_duplicate = true
```

---

### ✅ Unique Key Strategy

```
unique_key = email || phone
```

Rules:

* If BOTH missing → treat as new entry (no duplicate check)
* If either exists → use for duplicate detection

---

### ✅ Campaign Handling

```
campaign_id → nullable
```

* Forms can exist without campaign
* Leads inherit campaign if present

---

### ✅ API Structure

```
GET  /public/forms/:slug
POST /public/forms/:slug/submit
```

---

### ✅ Response Structure (Frontend Aligned)

```json
{
  "data": {
    "field_id_1": "value",
    "field_id_2": "value"
  }
}
```

---

### ✅ API Response (Strict)

```json
{ "success": true }
```

* No duplicate flag returned
* Silent duplicate handling

---

### ✅ Storage Rule

* ALWAYS insert into `leads`
* NEVER reject duplicates

```
is_duplicate = true / false
```

---

### ✅ Slug Rule

```
slug → unique per organization
```

---

### ✅ Form Editing

* No versioning
* Fields editable anytime
* Old data remains safe via field IDs

---

# 4. Database Design

---

## 4.1 Forms

```
forms
- id
- organization_id
- campaign_id (nullable)
- name
- slug (unique per org)
- status (draft / active / expired)
- created_at
```

---

## 4.2 Form Fields

```
form_fields
- id (used as frontend fieldId)
- form_id
- label
- type
- is_required
- options (json)
- order
```

---

## 4.3 Form Submissions (Raw Layer)

```
form_submissions
- id
- form_id
- organization_id
- data (json)           // fieldId → value
- utm_data (json)
- source
- ip_address
- user_agent
- created_at
```

---

## 4.4 Leads (Main Table)

```
leads
- id
- organization_id
- branch_id

- first_name
- last_name
- email
- phone

- country
- state
- city

- source
- source_detail

- utm_source
- utm_medium
- utm_campaign

- form_id
- campaign_id

- is_duplicate (boolean)

- duplicate_count (integer)   // NEW

- raw_payload (json)

- assigned_to
- assigned_at

- created_at
```

---

## 4.5 Analytics Tables

### Form Stats

```
form_stats
- id
- form_id
- total_submissions
- unique_submissions
- duplicate_attempts
- last_submission_at
- updated_at
```

---

### Daily Stats

```
form_daily_stats
- id
- form_id
- date
- total_submissions
- unique_submissions
```

---

# 5. Lead Ingestion Service (FINAL FLOW)

### Service: `LeadIngestionService`

---

## Step-by-Step Flow

---

### 1. Fetch Form by Slug

```
GET /public/forms/:slug
```

---

### 2. Validate Form Status

| Status  | Behavior |
| ------- | -------- |
| draft   | ❌ reject |
| active  | ✅ allow  |
| expired | ❌ reject |

---

### 3. Validate Input

* Required fields
* Email format
* CAPTCHA
* Honeypot

---

### 4. Rate Limiting

Strategy:

```
Per IP + per form
Limit: X requests per minute
```

Example:

```
10 requests/minute/IP/form
```

---

### 5. Extract Unique Key

```
email OR phone
```

---

### 6. Duplicate Detection

Condition:

```
same unique_key + same form_id
```

---

### 7. Duplicate Limit Protection (NEW)

```
MAX_DUPLICATE_LIMIT = 5 (configurable)
```

If exceeded:

* Still accept request
* BUT:

  * Do NOT create new lead
  * Only log submission

---

### 8. Store Raw Submission

Insert into:

```
form_submissions
```

---

### 9. Store Lead

Always insert unless duplicate limit exceeded:

```
is_duplicate = true/false
duplicate_count += 1
```

---

### 10. Normalize Data

Map:

* full_name → first_name / last_name
* fieldId → structured fields

---

### 11. Assignment Engine

* Location-based
* Round-robin fallback

---

### 12. Update Analytics

* total_submissions++
* duplicate_attempts++
* unique_submissions++

---

### 13. Return Response

```json
{ "success": true }
```

---

# 6. Duplicate Handling Strategy

| Scenario              | Action               |
| --------------------- | -------------------- |
| First submission      | is_duplicate = false |
| Repeat submission     | is_duplicate = true  |
| Over duplicate limit  | skip lead insert     |
| Missing email & phone | always new           |

---

# 7. Security & Anti-Spam

* CAPTCHA (mandatory)
* Rate limiting (per minute)
* Honeypot field
* IP tracking
* User agent logging

---

# 8. Data Mapping Strategy

* `form_fields.id` = frontend `fieldId`
* Data stored as:

```
fieldId → value
```

* Backend maps to structured fields

---

# 9. Public Form Handling

* Accessible via:

```
/f/:slug
```

* Backend APIs:

```
GET form config
POST submission
```

---

# 10. Edge Case Handling

---

### Case 1: Missing Email & Phone

* Always treated as new lead

---

### Case 2: Form Edited After Submissions

* Old data remains valid (fieldId-based)
* New fields appear only for new submissions

---

### Case 3: Duplicate Flood

* Controlled via:

  * duplicate limit
  * rate limit

---

### Case 4: Direct API Abuse

* Block via:

  * CAPTCHA
  * rate limiting

---

### Case 5: Slug Conflict

* Enforce unique constraint per org

---

# 11. Critical Rules

* Never reject duplicate submissions
* Always store raw data
* Always return success response
* Never rely on label for data mapping
* Always validate form status before insert

---

# 12. Final System Flow

```
User Opens Form →
Submit →
Validate →
Rate Limit →
Duplicate Check →
Store Submission →
Store Lead →
Assign →
Update Analytics →
Return Success
```

---

# 13. System Strength

* Fully frontend-aligned
* Duplicate-safe + analytics-ready
* Abuse-protected
* Flexible schema
* Public form ready
* Scalable for campaigns

---

**This plan is now production-safe and implementation-ready.**
