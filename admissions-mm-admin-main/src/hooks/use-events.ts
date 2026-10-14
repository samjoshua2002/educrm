/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import {
  AnnouncementEventItem,
  AudiencePreview,
  AudienceTargeting,
  CreateAnnouncementEventInput,
  UpdateAnnouncementEventInput,
} from "@/types/events";

const arr = (a: any, b: any): string[] => (Array.isArray(a) ? a : Array.isArray(b) ? b : []);

/** Maps an API row (camelCase or snake_case) to the frontend shape. */
export function mapEvent(item: any): AnnouncementEventItem {
  return {
    id: item.id,
    organizationId: item.organizationId || item.organization_id,
    title: item.title,
    type: item.type || "announcement",
    category: item.category || "General",
    priority: item.priority || "Medium",
    status: item.status || "Published",
    targetAudience: arr(item.targetAudience, item.target_audience),
    targetLeadStages: arr(item.targetLeadStages, item.target_lead_stages),
    targetLeadSources: arr(item.targetLeadSources, item.target_lead_sources),
    targetApplicationStatuses: arr(item.targetApplicationStatuses, item.target_application_statuses),
    targetBranchIds: arr(item.targetBranchIds, item.target_branch_ids),
    targetAcademicSession: item.targetAcademicSession || item.target_academic_session || undefined,
    targetCourseId: item.targetCourseId || item.target_course_id,
    targetCourseName: item.targetCourseName || item.target_course_name,
    eventStartDate: item.eventStartDate || item.event_start_date,
    eventEndDate: item.eventEndDate || item.event_end_date,
    eventStartTime: item.eventStartTime || item.event_start_time,
    eventEndTime: item.eventEndTime || item.event_end_time,
    venueType: item.venueType || item.venue_type || "in_person",
    venueLocation: item.venueLocation || item.venue_location,
    scheduledPublishDate: item.scheduledPublishDate || item.scheduled_publish_date,
    scheduledPublishTime: item.scheduledPublishTime || item.scheduled_publish_time,
    scheduledPublishAt: item.scheduledPublishAt || item.scheduled_publish_at || undefined,
    description: item.description,
    posterUrl: item.posterUrl || item.poster_url,
    attachmentUrl: item.attachmentUrl || item.attachment_url,
    attachmentName: item.attachmentName || item.attachment_name,
    attachmentType: item.attachmentType || item.attachment_type || "other",
    sendInAppNotification: item.sendInAppNotification ?? item.send_in_app_notification ?? true,
    sendEmailBroadcast: item.sendEmailBroadcast ?? item.send_email_broadcast ?? false,
    sendWhatsapp: item.sendWhatsapp ?? item.send_whatsapp ?? false,
    emailTemplateId: item.emailTemplateId || item.email_template_id,
    createdByName: item.createdByName || item.created_by_name || "Admissions Team",
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
    publishedAt: item.publishedAt || item.published_at || undefined,
    deliveryStatus: item.deliveryStatus ?? item.delivery_status ?? null,
    lastDeliveredAt: item.lastDeliveredAt ?? item.last_delivered_at ?? null,
    deliveryStats: item.deliveryStats ?? item.delivery_stats ?? null,
  };
}

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
        
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        } else if (res && Array.isArray(res.items)) {
          list = res.items;
        }

        return list.map(mapEvent);
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
        const raw = res?.data || res;
        if (raw && (raw.id || raw.title)) {
          return mapEvent(raw);
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
      return { item: res?.item || event, message: res?.message as string | undefined, success: res?.success !== false };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      if (res.success) toast.success(res.message || "Broadcast started for the target audience.");
      else toast.error(res.message || "Published, but delivery could not start.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to broadcast announcement.");
    },
  });
}

// 7. Audience preview: how many staff / students / leads / applicants a targeting selection reaches
export function useAudiencePreview(targeting: AudienceTargeting, enabled = true) {
  const orgId = useAuthStore((state) => state.user?.organizationId);
  const key = JSON.stringify(targeting);
  return useQuery({
    queryKey: ["events", "audience-preview", orgId, key],
    queryFn: () => apiPost<AudiencePreview>(`/organizations/${orgId}/events/audience-preview`, targeting),
    enabled: !!orgId && enabled,
    staleTime: 30_000,
  });
}
