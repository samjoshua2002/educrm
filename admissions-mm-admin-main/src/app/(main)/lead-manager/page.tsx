import { redirect } from "next/navigation";

/**
 * Legacy template route. The real lead list lives at /organization/lead-manager
 * (counselors are moved on to /organization/leads by the middleware).
 */
export default function LegacyLeadManagerRedirect() {
  redirect("/organization/lead-manager");
}
