import { redirect } from "next/navigation";

/**
 * Legacy template page that kept made-up locations in the browser only. The real page is /organization/settings/locations.
 */
export default function Page() {
  redirect("/organization/settings/locations");
}
