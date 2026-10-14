import { redirect } from "next/navigation";

/**
 * Legacy template sign-up form that created nothing. Accounts are created by admins; the real login is /login.
 */
export default function Page() {
  redirect("/login");
}
