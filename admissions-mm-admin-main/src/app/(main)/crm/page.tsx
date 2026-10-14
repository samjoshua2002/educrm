import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Legacy template route. The real dashboards live under /superadmin/dashboard
 * and /organization/dashboard (reports under /organization/reports), so this
 * page only forwards the signed-in user to the right one.
 */
export default async function LegacyDashboardRedirect() {
  const role = (await cookies()).get("user_role")?.value;
  if (!role) redirect("/login");
  if (role === "superadmin") redirect("/superadmin/dashboard");
  if (role === "student") redirect("/my-application");
  redirect("/organization/dashboard");
}
