import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { PaginatedResponse } from "@/types/api";

export type LocationType = "Center" | "Interview";

export interface Location {
  id: string;
  organizationId: string;
  type: LocationType;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pin?: string | null;
  country: string;
  currency?: string | null;
  currencySymbol?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationInput {
  type: LocationType;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  country?: string;
  currency?: string;
  currencySymbol?: string;
  isActive?: boolean;
}

export function useLocations(filters?: { type?: LocationType; isActive?: boolean; search?: string }) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["locations", orgId, filters],
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<Location>>(`/organizations/${orgId}/locations`, filters);
      return res.data;
    },
    enabled: !!orgId,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: CreateLocationInput) => apiPost<Location>(`/organizations/${orgId}/locations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location created successfully");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create location"),
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLocationInput> }) =>
      apiPatch<Location>(`/organizations/${orgId}/locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location updated successfully");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update location"),
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location deactivated successfully");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to deactivate location"),
  });
}
