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
        
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        } else if (res && Array.isArray(res.items)) {
          list = res.items;
        }

        return list.map((item: any): AnnouncementEventItem => ({
          id: item.id,
          organizationId: item.organizationId || item.organization_id,
          title: item.title,
          type: item.type || "announcement",
          category: item.category || "General Notice",
          priority: item.priority || "Medium",
          status: item.status || "Published",
          targetAudience: Array.isArray(item.targetAudience) ? item.targetAudience : (Array.isArray(item.target_audience) ? item.target_audience : []),
          targetLeadStages: Array.isArray(item.targetLeadStages) ? item.targetLeadStages : (Array.isArray(item.target_lead_stages) ? item.target_lead_stages : []),
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
        }));
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
          return {
            id: raw.id,
            organizationId: raw.organizationId || raw.organization_id,
            title: raw.title,
            type: raw.type || "announcement",
            category: raw.category || "General Notice",
            priority: raw.priority || "Medium",
            status: raw.status || "Published",
            targetAudience: Array.isArray(raw.targetAudience) ? raw.targetAudience : (Array.isArray(raw.target_audience) ? raw.target_audience : []),
            targetLeadStages: Array.isArray(raw.targetLeadStages) ? raw.targetLeadStages : (Array.isArray(raw.target_lead_stages) ? raw.target_lead_stages : []),
            targetCourseId: raw.targetCourseId || raw.target_course_id,
            targetCourseName: raw.targetCourseName || raw.target_course_name,
            eventStartDate: raw.eventStartDate || raw.event_start_date,
            eventEndDate: raw.eventEndDate || raw.event_end_date,
            eventStartTime: raw.eventStartTime || raw.event_start_time,
            eventEndTime: raw.eventEndTime || raw.event_end_time,
            venueType: raw.venueType || raw.venue_type || "in_person",
            venueLocation: raw.venueLocation || raw.venue_location,
            scheduledPublishDate: raw.scheduledPublishDate || raw.scheduled_publish_date,
            scheduledPublishTime: raw.scheduledPublishTime || raw.scheduled_publish_time,
            description: raw.description,
            posterUrl: raw.posterUrl || raw.poster_url,
            attachmentUrl: raw.attachmentUrl || raw.attachment_url,
            attachmentName: raw.attachmentName || raw.attachment_name,
            attachmentType: raw.attachmentType || raw.attachment_type || "other",
            sendInAppNotification: raw.sendInAppNotification ?? raw.send_in_app_notification ?? true,
            sendEmailBroadcast: raw.sendEmailBroadcast ?? raw.send_email_broadcast ?? false,
            sendWhatsapp: raw.sendWhatsapp ?? raw.send_whatsapp ?? false,
            emailTemplateId: raw.emailTemplateId || raw.email_template_id,
            createdByName: raw.createdByName || raw.created_by_name || "Admissions Team",
            createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
            updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
          } as AnnouncementEventItem;
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
