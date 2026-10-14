import { redirect } from "next/navigation";

/**
 * Legacy template login form that did not sign anyone in. The real login is /login.
 */
export default function Page() {
  redirect("/login");
}
