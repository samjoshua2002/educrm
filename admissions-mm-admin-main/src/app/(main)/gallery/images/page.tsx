import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Legacy template page that showed made-up gallery items (no backend). It
 * forwards the signed-in user to their dashboard.
 */
export default async function LegacyGalleryRedirect() {
  const role = (await cookies()).get("user_role")?.value;
  if (!role) redirect("/login");
  if (role === "superadmin") redirect("/superadmin/dashboard");
  if (role === "student") redirect("/my-application");
  redirect("/organization/dashboard");
}
