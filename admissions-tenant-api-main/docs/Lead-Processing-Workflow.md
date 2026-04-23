# Lead Processing Workflow — After Capture

**Date**: 2026-04-20
**Purpose**: This document defines the complete real-world workflow of what happens after a lead is captured in the system. It covers every role's responsibilities, the exact sequence of operations, assignment logic, and the journey from raw lead to either application conversion or closure.

**This is a planning document. No code changes.**

---

## Current State (What Exists Today)

| Feature | Status |
| :--- | :--- |
| Lead capture via public forms | ✅ Done |
| Raw submission storage | ✅ Done |
| Duplicate detection (email/phone per form) | ✅ Done |
| Auto-assignment (round-robin to counselors) | ✅ Done |
| UTM & source tracking | ✅ Done |
| Form analytics (daily + aggregate) | ✅ Done |
| Lead listing + search | ✅ Done |
| Lead status / stage field | ❌ Missing |
| Lead verification workflow | ❌ Missing |
| Manual assignment / reassignment | ❌ Missing |
| Notes / activity timeline | ❌ Missing |
| Follow-up scheduling | ❌ Missing |
| Lead scoring | ❌ Missing |
| Disposition codes | ❌ Missing |
| Closure with reason | ❌ Missing |
| Conversion to application | ❌ Missing |

---

## The Real-World Scenario

Think of a large engineering institute ("TechVista University") with 3 branches, receiving 200+ leads per day from Google Ads, website forms, education portals, and walk-ins.

**The people involved:**
- **Org Admin** (Director of Admissions) — Oversees everything, creates staff
- **Lead Manager** (2 people) — Quality gatekeepers, verify and route leads
- **Counselors** (15 people) — Call students, convince them to apply
- **Application Manager** (3 people) — Review submitted applications
- **Exam Manager** (1 person) — Plan entrance tests

This is exactly how the system should work for them.

---

## Stage 1: Lead Arrives (Automatic)

### What happens

A student fills out a public form (e.g., from a Google Ad landing page).

```
Student submits form → Lead Ingestion Service processes it
```

### System actions (already built)

1. Validate form fields against the form definition
2. Extract email and phone from the submission
3. Check for duplicates (same email/phone on the same form)
4. If duplicate: increment `duplicateCount`, update `rawPayload`, log submission
5. If new: create a Lead record with status **`new`**
6. Run auto-assignment engine (round-robin across active counselors)
7. Update form analytics (daily + aggregate stats)

### Lead record after this stage

```
status: "new"
assignedTo: <counselor-uuid> (auto-assigned)
verifiedBy: null
verifiedAt: null
score: null
```

### Who sees what at this point

| Role | What they see |
| :--- | :--- |
| Lead Manager | New lead appears in **Verification Queue** |
| Counselor | Lead appears in **My Assigned Leads** (but marked as unverified) |
| Org Admin | Lead count updates on dashboard |

---

## Stage 2: Lead Verification (Lead Manager)

### Why this stage exists

Raw leads from ads and forms are often junk — wrong numbers, spam emails, test submissions, or duplicates from the same person. The Lead Manager filters these before counselors waste time calling them.

### Real-world scenario

> Lead Manager opens the Verification Queue at 9 AM. She sees 47 new leads from overnight.
> - Lead #1: "John Doe", phone starts with 00000 → **Unqualified** (junk)
> - Lead #2: "Priya Singh", valid phone, interested in B.Tech → **Qualified**
> - Lead #3: Same email as Lead #2 but different phone → flagged as **Duplicate**, Lead Manager decides to merge

### Lead Manager's actions

| Action | What it does | New Lead Status |
| :--- | :--- | :--- |
| **Qualify** | Marks lead as valid and ready for counseling | `qualified` |
| **Disqualify** | Marks lead as junk/invalid | `unqualified` |
| **Flag Duplicate** | Marks as duplicate, optionally merge with original | `unqualified` (or merged) |
| **Reopen** | Brings back a previously closed/unqualified lead | `new` |

### What the system needs for this

```
PATCH /organizations/:orgId/leads/:id/verify
Body: {
  "action": "qualify" | "disqualify",
  "reason": "Valid contact, interested in B.Tech CS",     // mandatory for disqualify
  "duplicateOfLeadId": "uuid"                             // optional, for merge
}
```

### Verification rules

1. Only `lead_manager` (and `superadmin`, `org_admin`) can verify leads
2. A lead can only be verified when its status is `new`
3. Disqualification requires a reason (mandatory field)
4. Verified lead gets `verifiedBy` and `verifiedAt` timestamps
5. Qualified leads remain assigned to whoever was auto-assigned, OR the Lead Manager can reassign at this point

---

## Stage 3: Lead Assignment (Lead Manager / System)

### How assignment works in real life

**Scenario A — Auto-assignment (already built):**
When a lead is captured, the system auto-assigns it to a counselor using round-robin. This is the default for all incoming leads.

**Scenario B — Manual reassignment (needs to be built):**
The Lead Manager reviews assignments and moves leads based on:
- **Geography**: "This lead is from Delhi, assign to Riya who handles North India"
- **Program interest**: "This lead wants MBA, assign to Arjun who specializes in MBA counseling"
- **Workload**: "Neha has 80 leads, Riya has 30 — move some to Riya"
- **Performance**: "Vikram hasn't followed up on 12 leads in 5 days — reassign his stale leads"

**Scenario C — Auto-reassignment (needs to be built, Phase 2):**
If a counselor doesn't touch a lead for X days (global setting), the system automatically reassigns it to another counselor.

### What the system needs for this

```
PATCH /organizations/:orgId/leads/:id/assign
Body: {
  "assignedTo": "counselor-uuid",
  "reason": "Reassigned due to geography match"     // optional
}
```

### Assignment rules

1. Only `lead_manager`, `org_admin`, `superadmin` can reassign leads
2. Leads can only be assigned to users with role `counselor` in the SAME organization
3. Assignment creates an entry in the lead activity timeline
4. The previous counselor loses access; the new counselor gains access

---

## Stage 4: Counselor Works the Lead

### Real-world daily routine of a counselor

> Riya logs in at 9:30 AM. Her dashboard shows:
> - **Today's Follow-ups**: 8 leads scheduled for today
> - **New Assignments**: 5 leads assigned since yesterday, not yet contacted
> - **Hot Leads**: 3 leads with score > 80
> - **Overdue**: 2 leads with no activity for 3+ days

She picks the first follow-up from the queue and calls the student.

### What counselors do with a lead

| Action | Description | Effect on Lead |
| :--- | :--- | :--- |
| **Add Note** | Log call outcome, conversation details | Creates activity timeline entry |
| **Set Disposition** | Record call result (contacted, no answer, etc.) | Updates lead disposition |
| **Schedule Follow-up** | Set next call/contact date | Sets `nextFollowUpAt` |
| **Update Status** | Move lead through stages | Changes lead status |
| **Convert to Application** | Student agrees to apply | Creates Application + Student record |
| **Close Lead** | End the lead journey | Moves to `closed` with reason |

### Disposition Codes (what happened on the call)

| Code | Meaning | Typical Next Action |
| :--- | :--- | :--- |
| `contacted_interested` | Reached, student wants to apply | Schedule follow-up or convert |
| `contacted_not_ready` | Reached, student needs time | Schedule follow-up in 3-7 days |
| `contacted_not_interested` | Reached, student says no | Close lead (lost) |
| `no_answer` | Called but didn't pick up | Retry next day |
| `voicemail` | Got voicemail | Retry in 2 days |
| `busy` | Line busy | Retry same day / next day |
| `wrong_number` | Number doesn't belong to lead | Report to Lead Manager |
| `disconnected` | Number not in service | Report to Lead Manager |
| `do_not_call` | Student asked not to be called | Close lead (DNC) |

### What the system needs for this

```
POST /organizations/:orgId/leads/:id/notes
Body: {
  "content": "Called Priya. She is interested in B.Tech CS. Wants to discuss with parents. Follow up on Monday.",
  "disposition": "contacted_not_ready",
  "nextFollowUpAt": "2026-04-22T10:00:00Z"
}
```

```
PATCH /organizations/:orgId/leads/:id/status
Body: {
  "status": "working",
  "reason": "Active counseling in progress"
}
```

### Counselor access rules

1. Counselors can ONLY see leads assigned to them
2. Counselors cannot reassign leads (only Lead Manager can)
3. Counselors cannot verify/disqualify leads (only Lead Manager can)
4. Counselors CAN add notes, update disposition, schedule follow-ups, and close leads
5. Counselors CAN convert a qualified lead into an application

---

## Stage 5: Lead Status Progression

### The fixed lifecycle (from the Blueprint)

```
                    ┌──────────┐
                    │   NEW    │  ← Lead captured
                    └────┬─────┘
                         │
                    Lead Manager verifies
                         │
              ┌──────────┴──────────┐
              │                     │
        ┌─────▼─────┐        ┌─────▼──────┐
        │ QUALIFIED  │        │UNQUALIFIED │  ← Junk / duplicate / invalid
        └─────┬──────┘        └────────────┘
              │
         Assigned to Counselor
              │
        ┌─────▼─────┐
        │  WORKING   │  ← Counselor actively calling / emailing
        └─────┬──────┘
              │
              │ ← Multiple calls, notes, follow-ups happen here
              │
     ┌────────┴────────┐
     │                 │
┌────▼────┐      ┌─────▼────┐
│CONVERTED│      │  CLOSED  │  ← Lost / not interested / DNC
└─────────┘      └──────────┘
     │
     ▼
Application Created
Student Record Created
```

### Status definitions

| Status | Who sets it | Meaning |
| :--- | :--- | :--- |
| `new` | System (auto) | Fresh lead, waiting for verification |
| `qualified` | Lead Manager | Verified as valid, ready for counseling |
| `unqualified` | Lead Manager | Junk, duplicate, or invalid |
| `working` | Counselor | Actively being contacted and counseled |
| `converted` | Counselor | Student agreed, application created |
| `closed` | Counselor / Lead Manager | Journey ended (with mandatory reason) |

### Allowed status transitions

| From | To | Who can do it |
| :--- | :--- | :--- |
| `new` | `qualified` | Lead Manager |
| `new` | `unqualified` | Lead Manager |
| `qualified` | `working` | Counselor (auto on first note) |
| `working` | `converted` | Counselor |
| `working` | `closed` | Counselor |
| `unqualified` | `new` | Lead Manager (reopen) |
| `closed` | `new` | Lead Manager (reopen) |

---

## Stage 6: Lead Scoring

### When scoring happens

Lead scoring runs at two points:
1. **On capture** — initial score based on form data (program fit, location, source quality)
2. **During counseling** — score adjusts based on engagement (calls answered, interest level)

### Score bands

| Band | Score Range | Meaning | Counselor Priority |
| :--- | :--- | :--- | :--- |
| 🔴 **Hot** | 70–100 | High intent, strong fit | Call first, same day |
| 🟡 **Warm** | 40–69 | Some interest, needs nurturing | Follow up within 2-3 days |
| 🔵 **Cold** | 0–39 | Low interest / poor fit | Low priority, batch follow-up |

### Scoring factors (Phase 2 implementation)

| Factor | Points | Example |
| :--- | :--- | :--- |
| Valid email + phone | +20 | Both provided and valid |
| Program match | +15 | Interested in a program offered |
| Geographic proximity | +10 | Same city as a branch |
| Source quality | +10 | Website form > social media > portal |
| Responded to call | +15 | Picked up phone on first attempt |
| Expressed timeline | +10 | "I want to apply this month" |
| Wrong number / bounce | -20 | Contact info is invalid |
| No answer 3+ times | -10 | Not engaging |

> **Note**: Lead scoring is a Phase 2 enhancement. The core workflow (stages 1–5) should be built first.

---

## Stage 7: Lead Conversion to Application

### When it happens

The counselor has been working a lead for days or weeks. The student finally says: _"Yes, I want to apply for B.Tech Computer Science."_

### What the system does

```
Counselor clicks "Convert to Application"
         │
         ▼
┌──────────────────────┐
│ System creates:       │
│  1. Student record    │
│  2. Application record│
│  3. Links to lead     │
│  4. Lead status →     │
│     "converted"       │
└──────────────────────┘
```

### Conversion rules

1. Only leads with status `qualified` or `working` can be converted
2. Conversion creates a **Student** record (if one doesn't already exist for that email/phone in the org)
3. Conversion creates an **Application** record linked to the Student
4. The lead status changes to `converted`
5. The lead is NOT deleted — it stays for reporting and audit trail
6. A converted lead cannot be modified further (it's frozen)

### What the system needs for this

```
POST /organizations/:orgId/leads/:id/convert
Body: {
  "programId": "uuid",                    // What program they're applying to
  "sessionYear": "2026-27",               // Admission session
  "branchId": "uuid"                      // Which branch (optional)
}
```

**Response creates:**
```json
{
  "student": { "id": "uuid", "name": "Priya Singh", ... },
  "application": { "id": "uuid", "applicationNumber": "APP-2026-0001", ... },
  "lead": { "id": "uuid", "status": "converted" }
}
```

---

## Stage 8: Lead Closure (Without Conversion)

### When it happens

Not every lead converts. The counselor closes the lead when:
- Student explicitly says "not interested"
- Student is unreachable after multiple attempts
- Student enrolled elsewhere
- Contact data is completely invalid
- Student requests Do Not Call

### Closure rules

1. Only counselors (for their assigned leads) and Lead Managers can close leads
2. A **closure reason** is mandatory
3. Closed leads can be **reopened** by the Lead Manager if circumstances change

### Closure reasons

| Reason Code | Display Label |
| :--- | :--- |
| `not_interested` | Not Interested |
| `enrolled_elsewhere` | Enrolled Elsewhere |
| `unreachable` | Unreachable After Multiple Attempts |
| `invalid_contact` | Invalid Contact Information |
| `do_not_call` | Do Not Call Requested |
| `financial_constraints` | Financial Constraints |
| `timing_mismatch` | Wrong Admission Cycle |
| `other` | Other (requires free text) |

### What the system needs for this

```
PATCH /organizations/:orgId/leads/:id/close
Body: {
  "reason": "not_interested",
  "notes": "Student confirmed via WhatsApp that she has joined another university."
}
```

---

## Complete Role Summary — Who Does What

### Org Admin (Director of Admissions)

| Action | When |
| :--- | :--- |
| View dashboard metrics | Daily |
| Review lead volume and conversion rates | Weekly |
| Create/manage staff accounts | As needed |
| Configure forms and campaigns | As needed |
| Escalate issues to Superadmin | Rare |

**The Org Admin does NOT directly work leads.** They manage the team and monitor performance.

### Lead Manager (Quality Gatekeeper)

| Action | When | API Needed |
| :--- | :--- | :--- |
| Review verification queue | Multiple times daily | `GET /leads?status=new` |
| Qualify or disqualify leads | Per lead | `PATCH /leads/:id/verify` |
| Detect and handle duplicates | During verification | `PATCH /leads/:id/verify` |
| Reassign leads between counselors | As needed | `PATCH /leads/:id/assign` |
| Reopen closed or unqualified leads | Rare | `PATCH /leads/:id/status` |
| Monitor counselor performance | Weekly | Dashboard metrics |
| Review stale/untouched leads | Daily | `GET /leads?status=working&staleDays=3` |

### Counselor (Conversion Executor)

| Action | When | API Needed |
| :--- | :--- | :--- |
| View assigned leads | On login | `GET /leads?assignedTo=me` |
| View today's follow-ups | On login | `GET /leads?followUpDate=today` |
| Call lead and add notes | Per lead | `POST /leads/:id/notes` |
| Set disposition code | After each call | `POST /leads/:id/notes` (includes disposition) |
| Schedule next follow-up | After each call | `POST /leads/:id/notes` (includes followUpAt) |
| Convert lead to application | When student agrees | `POST /leads/:id/convert` |
| Close lead | When journey ends | `PATCH /leads/:id/close` |

### Application Manager (Post-Conversion)

| Action | When | API Needed |
| :--- | :--- | :--- |
| Review submitted applications | Daily | `GET /applications?status=pending` |
| Verify application data | Per application | `PATCH /applications/:id/verify` |
| Review uploaded documents | Per application | `GET /applications/:id/documents` |
| Approve or reject application | Per application | `PATCH /applications/:id/verify` |
| Request corrections from student | Per application | `PATCH /applications/:id/verify` |

### Exam Manager (Event Planning)

| Action | When | API Needed |
| :--- | :--- | :--- |
| Create exam/interview/GD events | Per admission cycle | `POST /events` |
| Add venues (including external) | Per event | `POST /events/:id/venues` |
| Allocate students to venues | Before event | `POST /events/:id/allocations` |
| Publish results | After event | `PATCH /events/:id/results` |

---

## Lead Activity Timeline (Audit Trail)

Every action on a lead creates a timeline entry. This is the single most important feature for traceability.

### What gets logged

| Event | Actor | Example |
| :--- | :--- | :--- |
| Lead created | System | "Lead captured from form 'B.Tech Inquiry 2026'" |
| Lead auto-assigned | System | "Auto-assigned to counselor Riya Sharma" |
| Lead verified | Lead Manager | "Qualified by Amit Kumar — Valid contact, interested in B.Tech" |
| Lead reassigned | Lead Manager | "Reassigned from Riya to Arjun — MBA specialization match" |
| Note added | Counselor | "Called Priya. Interested but wants to discuss with parents." |
| Follow-up scheduled | Counselor | "Follow-up set for April 22 at 10:00 AM" |
| Status changed | Counselor | "Status changed from qualified → working" |
| Lead converted | Counselor | "Converted to Application APP-2026-0042" |
| Lead closed | Counselor | "Closed — Not interested. Enrolled at another university." |
| Lead reopened | Lead Manager | "Reopened — Student called back expressing interest" |

### Data model for timeline

```
lead_activities:
  id: UUID
  lead_id: UUID (FK → leads)
  organization_id: UUID (FK → organizations)
  actor_id: UUID (FK → users, who did this)
  action: VARCHAR (created, verified, assigned, note_added, status_changed, converted, closed, reopened)
  content: TEXT (note text, reason, details)
  disposition: VARCHAR (nullable, for call outcomes)
  previous_status: VARCHAR (nullable)
  new_status: VARCHAR (nullable)
  previous_assigned_to: UUID (nullable)
  new_assigned_to: UUID (nullable)
  created_at: TIMESTAMP
```

---

## What Needs to Be Built (Priority Order)

### Phase 2A — Core Lead Processing (Build First)

| # | Feature | Entity/API Changes |
| :--- | :--- | :--- |
| 1 | Add `status` field to Lead entity | `lead.entity.ts` — add enum (new, qualified, unqualified, working, converted, closed) |
| 2 | Add `verified_by`, `verified_at` to Lead | `lead.entity.ts` |
| 3 | Add `score`, `score_band` to Lead | `lead.entity.ts` |
| 4 | Add `next_follow_up_at` to Lead | `lead.entity.ts` |
| 5 | Add `closure_reason`, `closure_notes` to Lead | `lead.entity.ts` |
| 6 | Create `lead_activities` table | New entity for timeline |
| 7 | Build verification endpoint | `PATCH /leads/:id/verify` |
| 8 | Build reassignment endpoint | `PATCH /leads/:id/assign` |
| 9 | Build notes endpoint | `POST /leads/:id/notes` |
| 10 | Build status change endpoint | `PATCH /leads/:id/status` |
| 11 | Build closure endpoint | `PATCH /leads/:id/close` |
| 12 | Update leads listing with filters | Add `status`, `assignedTo`, `followUpDate`, `scoreBand` filters |

### Phase 2B — Application System (Build Second)

| # | Feature | New Module |
| :--- | :--- | :--- |
| 1 | Create Student entity | `students` module |
| 2 | Create Application entity | `applications` module |
| 3 | Build lead conversion endpoint | `POST /leads/:id/convert` |
| 4 | Build application CRUD | `applications` module |
| 5 | Build application verification | `PATCH /applications/:id/verify` |
| 6 | Build document upload/review | `documents` module |

### Phase 2C — Intelligence & Automation (Build Third)

| # | Feature |
| :--- | :--- |
| 1 | Lead scoring engine |
| 2 | Auto-reassignment on stale leads |
| 3 | Counselor performance dashboard |
| 4 | Lead aging alerts |
| 5 | Bulk operations (assign, close) |

---

## Summary

The lead lifecycle is a **5-stage funnel**:

```
CAPTURE → VERIFY → COUNSEL → CONVERT or CLOSE
```

**Every stage has a clear owner:**
- **Capture** → System (automatic)
- **Verify** → Lead Manager (manual quality gate)  
- **Counsel** → Counselor (manual relationship building)
- **Convert** → Counselor (triggers application creation)
- **Close** → Counselor or Lead Manager (with mandatory reason)

**Every action is tracked** in the activity timeline so the Org Admin and Lead Manager always know who did what, when, and why.

The system is designed so that **no lead is ever lost or skipped** — every lead must either convert into an application or be explicitly closed with a reason.
