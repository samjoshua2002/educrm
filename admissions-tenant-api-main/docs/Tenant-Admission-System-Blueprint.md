# Tenant Admission System — Complete Product Blueprint

## 1) Product Vision

This is a multi-tenant admission management SaaS for institutes. The platform is owned and operated by the Superadmin, while each organization functions as an independent tenant with its own branches, staff, leads, students, applications, payments, exams, and reports.

The product is designed to support large-scale operations, with 100+ organizations in the future and thousands of leads per organization. The system is intentionally built around a fixed workflow so that every institute follows the same operational gates and no lead is lost or skipped.

The system covers the full journey:

* Lead capture
* Lead verification
* Lead assignment
* Lead follow-up and scoring
* Lead conversion into application
* Manual application verification
* Payment tracking and gateway collection
* Exam / interview / GD planning
* Final admission decisions
* Future student self-service access

The platform should be stable, scalable, auditable, and easy to maintain across all tenants.

---

## 2) Core Product Principles

### 2.1 Fixed Workflow for All Organizations

All organizations must follow the same process stages. No tenant can define its own lead stages or bypass the system gates.

### 2.2 Complete Data Ownership by Organization

Each organization manages only its own leads, students, staff, applications, payments, and admissions. There is no shared student identity across organizations. If the same person exists in two organizations, they are treated as two separate student profiles with separate IDs and no connection.

### 2.3 High Traceability

Every important action must be trackable in business terms:

* Who verified the lead
* Who assigned the lead
* Who contacted the lead
* Who reopened, converted, rejected, or closed it
* Who reviewed the application
* Who approved or rejected documents
* Who handled payment status updates
* Who scheduled exam or interview events

### 2.4 Controlled Manual Operations

Certain high-value actions are intentionally manual:

* Lead verification is done by the Lead Manager
* Application verification is manual
* Document review is manual
* Lead closure is manual by counselors

### 2.5 Flexible but Disciplined Lead Handling

The system allows reassignment, reopening, duplicate management, and lead scoring, but these actions must still follow the fixed workflow.

### 2.6 Support for Future Expansion

The system must leave room for future modules such as student login, notifications, reporting, Excel import/export, and advanced analytics.

---

## 3) Platform Structure

### 3.1 Superadmin Layer

The Superadmin owns the platform and manages the SaaS business itself.

Main responsibilities:

* Create organization accounts
* Edit, suspend, reactivate, or delete organizations
* Define subscription duration and pricing
* Monitor active and expired organizations
* View revenue and usage across all tenants
* Access tenant support view
* Fully impersonate an organization user for troubleshooting

### 3.2 Organization Layer

Each organization is an independent institute using the SaaS.

Main responsibilities:

* Manage branches/campuses
* Create and manage forms
* Handle leads and applications
* Manage staff and roles
* Track payments and admissions
* Conduct exam/interview planning
* Report internal activity

### 3.3 Branch / Campus Layer

Each organization can have multiple branches or campuses.

Branch is used for:

* Staff assignment
* Lead routing
* Operational ownership
* Venue planning
* Reporting later on

A lead belongs to the organization and is linked to a branch where relevant. The branch is part of the organizational structure, not a separate tenant.

---

## 4) Major Roles and Their Work Environment

### 4.1 Superadmin

The Superadmin is the platform owner and operator.

What they do:

* Create organizations
* Set plans, pricing, and duration
* Track subscription expiry
* Review platform-wide performance
* Access tenant dashboards in support mode
* Resolve tenant issues without needing tenant credentials

Work environment:

* A central SaaS control dashboard
* Organization management area
* Subscription and billing oversight
* Support/impersonation access area

### 4.2 Organization Admin

The Organization Admin manages the institute-level setup and staff coordination.

What they do:

* Configure institute details and branding
* Create and manage branches
* Manage roles and staff access
* Oversee forms and pipeline behavior
* Monitor all operational stages inside the organization

Work environment:

* Organization dashboard
* Staff management area
* Configuration panels
* Summary views for leads, students, payments, and events

### 4.3 Lead Manager

The Lead Manager is the quality gatekeeper for incoming leads.

What they do:

* Review raw leads
* Perform soft duplicate checks
* Decide whether a lead is qualified or not
* Reopen a previously verified lead if needed
* Manage lead assignment coordination
* Review counselor performance and lead movement behavior

Work environment:

* Verification queue
* Lead review workspace
* Duplicate handling screen
* Assignment oversight panel

### 4.4 Lead Assistant / Admission Counselor

The Counselor is the execution-level user who converts interest into applications.

What they do:

* Work only on assigned leads
* Contact students and update notes
* Change lead progress based on interaction
* Add follow-up dates where needed
* Continue lead nurturing when students are not ready
* Close leads manually when appropriate
* Push interested students toward application submission

Work environment:

* Assigned lead list
* Follow-up queue
* Lead interaction timeline
* Lead scoring and status update workspace

### 4.5 Application Manager

The Application Manager handles the formal application side.

What they do:

* Review submitted applications
* Manually verify application data
* Review uploaded documents
* Mark applications as approved, rejected, or corrected
* Track application-level status changes
* Coordinate with payment and exam flow

Work environment:

* Application review screen
* Document verification area
* Approval/rejection workspace
* Application tracking dashboard

### 4.6 Interview / Exam Manager

The Interview / Exam Manager handles event planning and student allocation.

What they do:

* Create exam, interview, and GD events
* Add venues and multiple centers
* Plan temporary external venues
* Allocate students to venues
* Maintain venue capacity and event planning
* Publish results later

Work environment:

* Event creation panel
* Venue planning view
* Student allocation screen
* Result management workspace

---

## 5) Lead Capture System

The lead capture system is the entry point for all inquiries.

### 5.1 Lead Sources

Leads can come from multiple inbound sources:

* Web forms
* Landing pages
* Social media lead ads
* Education portals / partner sources
* Events and seminars
* Chatbots
* Manual entry by staff

### 5.2 Form Behavior

Organizations can create forms that support:

* Multi-step flow
* Conditional logic
* File uploads
* Consent checkboxes
* Hidden fields
* Cloning of older forms

### 5.3 Capture Goal

The goal is to capture leads seamlessly and standardize the data structure so that all sources enter the same workflow.

### 5.4 Raw Lead Entry

Every fresh inquiry enters as a raw/new lead. Raw leads are not yet trusted and must be reviewed before being assigned.

---

## 6) Lead Lifecycle Blueprint

The lead lifecycle is fixed for all organizations.

### 6.1 Lead Stages

1. **New**

   * Fresh lead captured from any source
   * No trust established yet
   * The lead is waiting for verification

2. **Working**

   * The lead is being actively handled by a counselor
   * Calls, notes, and contact attempts are happening
   * The lead may move through conversation and persuasion phases

3. **Qualified**

   * Passed soft deduplication and basic validity checks
   * Phone or email is usable
   * Ready for assignment or already assigned

4. **Unqualified**

   * Invalid, duplicate, non-serious, or not fit for continuation
   * Not suitable for the active funnel

5. **Closed**

   * The lead has reached the end of the pipeline manually
   * It may have been converted into an application, rejected, or closed for other business reasons

### 6.2 Extended Operational Flow

Even though the main fixed stages are New, Working, Qualified, Unqualified, and Closed, the business flow beneath them includes these internal states:

* Raw / New capture
* Verification review
* Assignment
* In-progress / Contacted
* Nurturing
* Converted to application
* Lost / rejected

These are the operational meanings behind the fixed workflow.

### 6.3 Disposition Codes

Disposition codes describe the result of a contact attempt or the reason for a state.

Common options include:

* Contacted / Interested
* No Answer / Voicemail
* Busy
* Wrong Number / Disconnected
* Not Interested
* Do Not Call

These codes help classify the interaction without changing the overall workflow structure.

### 6.4 Lead Ownership Rules

* A lead belongs to one organization only
* A lead can be linked to a branch inside that organization
* A lead may be reassigned internally between counselors
* A lead may be reopened after verification if needed
* Duplicate lead records can exist, but they must be handled carefully

---

## 7) Lead Verification Blueprint

### 7.1 Verification Responsibility

The Lead Manager alone verifies leads. No second approval layer is required.

### 7.2 Verification Purpose

Verification exists to:

* Check if the lead data is usable
* Detect duplicates softly
* Reduce junk or repeated entries
* Decide whether the lead is fit for assignment

### 7.3 Duplicate Handling

Duplicate detection is soft.

This means:

* Duplicate records can be identified
* History should be preserved
* The system should not permanently destroy useful lead context
* The manager can decide how to handle the duplicates

### 7.4 Merge Logic

When duplicates are found, there should be a merge-aware business process so the organization can preserve history instead of losing contact data, notes, or source tracking.

### 7.5 Reopening Leads

A verified lead can be reopened later if the counselor or manager believes the student is again relevant or available.

### 7.6 What Makes a Lead Qualified

A lead becomes qualified when it has passed manual review and basic contact-data validity checks.

---

## 8) Lead Assignment and Routing Blueprint

Lead assignment is one of the most important parts of the system.

### 8.1 Assignment Rules

Leads are assigned based on:

* Geographic location
* Program or course interest
* Workload balancing
* Staff availability information if needed for operational logic

### 8.2 Routing Factors

The system may use one or more of these factors together:

* Country, region, state, city
* Course or program type
* Lead volume distribution among counselors
* Lead score thresholds
* Branch relevance

### 8.3 Routing Outcomes

A lead can be routed to:

* A general counselor
* A program specialist
* A senior counselor for high-priority leads
* A branch-linked counselor if operationally needed

### 8.4 Assignment Modes

* Automatic assignment
* Manual reassignment
* Reassignment from the manager side when necessary

### 8.5 Workload Logic

The assignment engine should distribute leads fairly across the team, but also be able to prioritize high-value leads.

### 8.6 Reassignment Rules

If a lead remains untouched for a global number of days, the lead should be automatically reassigned. It can also be manually moved to another counselor at any time based on business need.

### 8.7 Global Untouched Lead Rule

The number of days a lead can remain untouched must be a global platform rule, not a tenant-specific rule.

### 8.8 Assignment Behavior During Counseling

When a lead is in processing, conversation, or nurturing mode, the counselor continues persuading the student and guiding them toward application submission.

---

## 9) Lead Follow-Up and Counseling Workflow

### 9.1 Purpose of the Counselor

Counselors are the active conversion team. Their job is not only to call the lead, but to keep the lead moving toward application.

### 9.2 Counselor Actions

* Make contact attempts
* Add call or follow-up notes
* Update the lead status
* Move the lead through working, qualified, nurturing, or closed states
* Encourage the student to complete the application
* Close the lead manually when the journey ends

### 9.3 Follow-Up Dates

Some leads will have a next follow-up date.

This means:

* The counselor has decided to revisit the lead later
* The lead is not dead, only delayed
* Follow-up reminders are part of the operating logic

### 9.4 Lead Aging

When leads are untouched for days:

* They can be auto reassigned
* They can also be manually assigned elsewhere
* The global no-action period governs this rule across all organizations

### 9.5 Lead Closure by Counselors

Lead closure is manual. Counselors close the lead after the work is complete, whether the outcome is conversion, loss, disinterest, or another business reason.

---

## 10) Lead Scoring Blueprint

Lead scoring is used to prioritize leads after assignment or during counseling.

### 10.1 Why Lead Scoring Exists

* To identify high-intent leads
* To help counselors prioritize effort
* To route stronger leads to more experienced team members if needed
* To separate hot, warm, and cold opportunities

### 10.2 Scoring Inputs

The score may use:

* Academic profile
* Work experience or background relevance
* Engagement level
* Program fit
* Geographic fit
* Response quality
* Invalid or bounced contact data penalties

### 10.3 Score Bands

* **Hot**: Strong fit and high engagement
* **Warm**: Potential interest, needs nurturing
* **Cold**: Low urgency or weak engagement

### 10.4 Scoring Outcome

Lead score should influence counseling priority, not break the fixed workflow.

---

## 11) Lead Closure, Lost, and Rejection Logic

### 11.1 Closed Leads

A lead may be closed when the counselor determines the interaction is complete.

### 11.2 Lost / Rejected Leads

A lead may be rejected or lost because:

* It is invalid
* It is a duplicate
* It is unresponsive
* It is not interested
* It failed suitability or assessment

### 11.3 Mandatory Reason Field

Rejected or lost leads should always carry a reason so reporting remains meaningful.

### 11.4 Reopen Possibility

A closed or rejected lead can be reopened in exceptional cases if business circumstances change.

---

## 12) Student Model Blueprint

### 12.1 Student Creation Timing

The student is created at the time of application.

### 12.2 Student Identity Scope

* One student belongs to one organization only
* A person may exist in another organization, but only as a separate profile and separate student ID
* There is no shared identity between organizations

### 12.3 Student Purpose

The student becomes the master entity after application submission and will later support:

* Profile viewing
* Payment checking
* Result viewing
* Notices
* Future login access

---

## 13) Application Blueprint

### 13.1 Application as a Separate Record

The application is a separate business record from the lead.

### 13.2 One Student, Multiple Applications

One student can have multiple applications for different programs or sessions.

### 13.3 Application Creation Path

When the counselor successfully convinces the student to apply:

* The application form is filled
* A student record is created at that point
* The application is linked to that student
* The lead may then be closed manually by the counselor

### 13.4 Application Editing

Applications can be edited after submission when business rules allow.

### 13.5 Exceptional Rejection and Reopening

An application may be rejected or reopened in special cases depending on manual review or exam/interview decisions.

### 13.6 Application Numbering

Every formal application gets a unique application number.

---

## 14) Application Verification Blueprint

### 14.1 Verification Responsibility

Application verification is manual.

### 14.2 Verification Objectives

* Ensure form data is correct
* Confirm documents are present
* Confirm business eligibility
* Check whether the application is ready for the next step

### 14.3 Document Review

Documents are checked manually by the responsible staff.

### 14.4 Possible Outcomes

* Approved
* Rejected
* Correction required
* Pending review

---

## 15) Document Handling Blueprint

### 15.1 Document Upload

Applications may contain file uploads such as academic records, IDs, and other supporting files.

### 15.2 Manual Review Only

All review and verification decisions are handled manually.

### 15.3 Future Scope

Advanced document intelligence may be introduced later, but it is not part of this version.

---

## 16) Payment Blueprint

### 16.1 Payment Purpose

The system should track and collect payments related to admissions.

### 16.2 Supported Payment Behavior

* Payment status tracking
* Payment collection through gateways
* Recording of payment dates and amounts

### 16.3 What Is Not Included in This Version

* Installment planning
* Partial payment handling
* Refund management

### 16.4 Organization-Level Gateway Selection

Each organization can configure one or more gateways from supported providers such as:

* Stripe
* Razorpay
* PayPal
* PhonePe

Organizations choose which payment gateway they want to use and configure it with their own credentials.

### 16.5 Payment Scope

These gateways are for student payment collection within the organization flow.

---

## 17) Exam / Interview / GD Blueprint

### 17.1 Event Types

* Exam
* Interview
* GD

### 17.2 Venue Planning

An event can have multiple venues.

### 17.3 External Venues

Venues do not need to belong to the institute. Temporary external venues are allowed.

### 17.4 Location Planning Logic

The organization may choose a venue based on where students are concentrated.

Example:

* Many students come from Delhi
* The main campus is in Kolkata
* The organization can create a temporary event venue in Delhi

### 17.5 Event Management Goal

The system should help organizations plan, allocate, and manage admission events in a practical way.

### 17.6 Future Scope

Detailed rules for event scheduling, attendance, seating, proctor assignment, and result publishing can be added later.

---

## 18) Subscription and SaaS Business Model

### 18.1 Fixed Global Subscription

There is one fixed subscription plan globally with expiration.

### 18.2 Superadmin Control

The Superadmin decides:

* Price
* Duration
* Organization activation window

### 18.3 No Free Trial

No free trial exists.

### 18.4 Tenant Billing Purpose

The subscription model supports the SaaS business side of the platform.

---

## 19) Access Control Philosophy

Access control is role-based and tenant-scoped.

Each role should only see what is appropriate for its work.

### Role boundaries:

* Superadmin controls the platform
* Organization Admin controls institute setup and operations
* Lead Manager controls verification and lead quality
* Counselor controls assigned lead conversion work
* Application Manager controls application verification
* Exam Manager controls event and venue planning

---

## 20) Data Rules and Safety Logic

### 20.1 Duplicate Lead Records

Duplicate lead records may exist.
The system must not assume all duplicates are errors; some may be useful for history and follow-up context.

### 20.2 Merge Awareness

Duplicates should be mergeable while history is preserved.

### 20.3 Delete Permission

Deletion is allowed.
This means the business has the freedom to remove records when needed, subject to organization permissions and operating policies.

### 20.4 Reopen Permission

Leads and applications can be reopened in specific business scenarios.

### 20.5 Manual Override

Managers can manually intervene when the automated flow does not reflect reality.

---

## 21) Operational Scenarios

### Scenario 1: Fresh Lead Arrives

A form submission comes in from a web page or ad. The lead enters as new and waits for verification.

### Scenario 2: Lead Contains Duplicate Details

The manager sees the lead as a soft duplicate. The record is not blindly discarded; history is preserved and a business decision is made.

### Scenario 3: Lead Is Verified and Assigned

The lead becomes qualified and is assigned according to geography, program, or load.

### Scenario 4: Counselor Calls but Student Is Not Ready

The counselor marks the lead as working or nurturing, adds a follow-up date, and continues the persuasion process.

### Scenario 5: Lead Goes Untouched for Days

The global inactivity rule triggers auto reassignment, or the manager manually moves the lead to another counselor.

### Scenario 6: Student Finally Agrees to Apply

The counselor helps the student complete the application form. At this moment, the student record is created, and the application is generated as a separate record.

### Scenario 7: Application Is Rejected in Review

The application manager marks it rejected or correction-needed. In special cases it can be reopened.

### Scenario 8: Payment Is Collected

The organization uses its chosen gateway to collect payment and the status is updated.

### Scenario 9: Exam / Interview Requires an External Venue

The organization books a temporary venue in a city where most students are located.

### Scenario 10: Superadmin Needs Support Access

The Superadmin logs in as a tenant user in support mode to troubleshoot directly.

---

## 22) Current Gaps and How They Are Handled Now

The following gaps have been folded into the blueprint:

* Student creation happens at application time
* Leads can stay in conversation or nurturing while counselors work on conversion
* Counselors close the lead manually
* Untouched leads are auto reassigned after a global number of days
* Follow-up dates are supported for some leads
* Lead belongs to organization and can be linked to a branch
* Reporting structure is postponed to a later version
* Notification system is postponed to a later version
* Deletion is allowed
* Excel import/export is future scope, not first version

---

## 23) Future Extensions

These are not required for the first release but are natural future additions:

* Student login panel
* Result checking by students
* Payment status viewing by students
* Personal profile view for students
* Important notices for students
* Reporting and analytics layer
* Notification system
* Excel import/export
* More advanced admission and event planning tools

---

## 24) Final Blueprint Summary

This platform is a fixed-workflow admission SaaS for multi-tenant institute operations. It starts with lead capture, moves through verification and assignment, supports counseling and follow-up, converts leads into separate applications and student records, manually verifies applications and documents, tracks payments through selectable gateways, and later supports event-based assessments such as interviews or exams in multiple venues, including temporary external venues.

The system is designed to scale across many organizations while keeping their data separate, their workflow disciplined, and their business operations easy to manage.
