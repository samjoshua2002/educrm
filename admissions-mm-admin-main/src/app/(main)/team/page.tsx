import { redirect } from "next/navigation";

/**
 * Legacy template page that showed made-up team members. The real team page is /organization/team.
 */
export default function Page() {
  redirect("/organization/team");
}
