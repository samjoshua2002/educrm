import { redirect } from "next/navigation";

/**
 * Subscriptions are managed per organization (Extend Subscription) on the organizations page.
 */
export default function Page() {
  redirect("/superadmin/organizations");
}
