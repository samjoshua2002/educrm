/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";
import {
  OrganizationIntegrationSettings,
  UpdateOrganizationIntegrationSettingsInput,
} from "@/types/organization-integration-settings";

export function useOrganizationIntegrationSettings(orgId?: string | null) {
  return useQuery({
    queryKey: ["organization-integration-settings", orgId],
    queryFn: () =>
      apiGet<OrganizationIntegrationSettings>(`/organizations/${orgId}/integration-settings`),
    enabled: !!orgId,
  });
}

export function useUpdateOrganizationIntegrationSettings(orgId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateOrganizationIntegrationSettingsInput) =>
      apiPatch<OrganizationIntegrationSettings>(`/organizations/${orgId}/integration-settings`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-integration-settings", orgId] });
      toast.success("Integration settings updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update integration settings");
    },
  });
}
