"use client";

// Counselors are sent here by the middleware (it redirects them away from
// /organization/lead-manager), so this route must render the lead list itself:
// redirecting back to /organization/lead-manager made an endless redirect loop
// for counselors. The API limits counselors to their own assigned leads.
import LeadManagerPage from "../lead-manager/page";

export default function LeadsPage() {
  return <LeadManagerPage />;
}
