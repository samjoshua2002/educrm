import { redirect } from "next/navigation";

/**
 * Legacy template route. It showed hard-coded sample leads instead of real data;
 * the real lead detail/edit page is /organization/lead-manager/edit?id=<leadId>.
 */
export default async function LegacyEditLeadRedirect({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  const leadId = Array.isArray(id) ? id[0] : id;
  redirect(leadId ? `/organization/lead-manager/edit?id=${encodeURIComponent(leadId)}` : "/organization/lead-manager");
}
