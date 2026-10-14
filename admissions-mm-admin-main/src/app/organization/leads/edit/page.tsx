"use client";

// Counselors are redirected away from /organization/lead-manager/* by the
// middleware, so this route renders the lead detail/edit page itself instead
// of redirecting there (which looped for counselors).
import EditLeadPage from "../../lead-manager/edit/page";

export default function LeadEditPage() {
  return <EditLeadPage />;
}
