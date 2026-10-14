import { redirect } from "next/navigation";

/**
 * Legacy template route. It showed a hard-coded sample lead (fake name, score,
 * timeline) for every id; the real lead page is /organization/lead-manager/edit?id=<leadId>.
 */
export default async function LegacyLeadDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/organization/lead-manager/edit?id=${encodeURIComponent(id)}`);
}
