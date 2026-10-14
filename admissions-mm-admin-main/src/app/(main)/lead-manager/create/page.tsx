import { redirect } from "next/navigation";

/**
 * Legacy template route. Its form never saved anything (it only logged to the
 * console); the working "Add Lead" form is /organization/lead-manager/create.
 */
export default function LegacyCreateLeadRedirect() {
  redirect("/organization/lead-manager/create");
}
