/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import {
  AnnouncementEventItem,
  CreateAnnouncementEventInput,
  UpdateAnnouncementEventInput,
} from "@/types/events";

// 1. Fetch all announcements & events from Database
export function useEvents(filters?: {
  type?: string;
  category?: string;
  status?: string;
  priority?: string;
  audience?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useQuery({
    queryKey: ["events", { orgId, ...filters }],
    queryFn: async () => {
      try {
        const url = orgId ? `/organizations/${orgId}/events` : "/events";
        const res = await apiGet<any>(url, filters);
        if (res && Array.isArray(res.data)) {
          return res.data as AnnouncementEventItem[];
        }
        if (Array.isArray(res)) {
          return res as AnnouncementEventItem[];
        }
        return [] as AnnouncementEventItem[];
      } catch (err) {
        console.error("Failed to fetch events from DB:", err);
        return [] as AnnouncementEventItem[];
      }
    },
    enabled: true,
  });
}

// 2. Fetch single event by id from Database
export function useEvent(id: string) {
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useQuery({
    queryKey: ["event", id, { orgId }],
    queryFn: async () => {
      if (!id) return null;
      try {
        const url = orgId
          ? `/organizations/${orgId}/events/${encodeURIComponent(id)}`
          : `/events/${encodeURIComponent(id)}`;
        const res = await apiGet<any>(url);
        if (res && (res.id || res.data?.id)) {
          return (res.data || res) as AnnouncementEventItem;
        }
      } catch (err) {
        console.error(`Failed to fetch event ${id} from DB:`, err);
      }
      return null;
    },
    enabled: Boolean(id),
  });
}

// 3. Create Event Mutation in Database
export function useCreateEvent() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useMutation({
    mutationFn: async (input: CreateAnnouncementEventInput) => {
      const url = orgId ? `/organizations/${orgId}/events` : "/events";
      const res = await apiPost<any>(url, input);
      return res?.data || res;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      const label = item?.type === "event" ? "Event" : "Announcement";
      toast.success(`${label} "${item?.title || ''}" created successfully in database!`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create announcement/event in database.");
    },
  });
}

// 4. Update Event Mutation in Database
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAnnouncementEventInput;
    }) => {
      const url = orgId
        ? `/organizations/${orgId}/events/${encodeURIComponent(id)}`
        : `/events/${encodeURIComponent(id)}`;
      const res = await apiPatch<any>(url, data);
      return res?.data || res;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", item?.id] });
      toast.success("Updated successfully in database!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update item in database.");
    },
  });
}

// 5. Delete Event Mutation in Database
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useMutation({
    mutationFn: async (id: string) => {
      const url = orgId
        ? `/organizations/${orgId}/events/${encodeURIComponent(id)}`
        : `/events/${encodeURIComponent(id)}`;
      await apiDelete(url);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Deleted successfully from database!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete item from database.");
    },
  });
}

// 6. Broadcast / Send Communication Immediately in Database
export function useBroadcastEvent() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useMutation({
    mutationFn: async (event: AnnouncementEventItem) => {
      const url = orgId
        ? `/organizations/${orgId}/events/${encodeURIComponent(event.id)}/broadcast`
        : `/events/${encodeURIComponent(event.id)}/broadcast`;
      const res = await apiPost<any>(url, {});
      return res?.item || event;
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(
        `Broadcast sent! In-app notification and email dispatched to target audience.`
      );
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to broadcast announcement.");
    },
  });
}
