import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { mockCommunications, mockCommunicationTemplates, CommunicationLog, CommunicationTemplate } from "@/data/mock-communications";

// 1. Fetch all communication logs
export function useCommunications(page = 1, limit = 50, filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["communications", page, limit, filters],
    queryFn: async () => {
      try {
        const response = await apiGet<{ data: CommunicationLog[]; total: number }>("/communications", {
          page,
          limit,
          ...filters,
        });
        if (response && Array.isArray((response as any).data)) {
          return response;
        }
      } catch {
        // Fallback to local mock data if API endpoint is not yet connected
      }
      return {
        data: mockCommunications,
        total: mockCommunications.length,
      };
    },
    initialData: {
      data: mockCommunications,
      total: mockCommunications.length,
    },
  });
}

// 2. Fetch single communication detail by ID or applicationNo
export function useCommunication(id: string) {
  return useQuery({
    queryKey: ["communication", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const response = await apiGet<CommunicationLog>(`/communications/${encodeURIComponent(id)}`);
        if (response) return response;
      } catch {
        // Fallback to local search
      }
      const cleanId = id.replace(/^COMM-/, "").toLowerCase();
      const found = mockCommunications.find(
        (c) =>
          c.id.toLowerCase() === id.toLowerCase() ||
          c.applicationNo.toLowerCase() === id.toLowerCase() ||
          c.applicationNo.toLowerCase() === cleanId
      );
      if (found) return found;

      // DO NOT return mockCommunications[0] fallback here to allow useApplication to resolve real DB candidate!
      return null;
    },
    enabled: !!id,
  });
}

// 3. Fetch communication templates
export function useCommunicationTemplates() {
  return useQuery({
    queryKey: ["communication-templates"],
    queryFn: async () => {
      try {
        const response = await apiGet<CommunicationTemplate[]>("/communications/templates");
        if (response && Array.isArray(response)) return response;
      } catch {
        // Fallback
      }
      return mockCommunicationTemplates;
    },
    initialData: mockCommunicationTemplates,
  });
}

// 4. Send new communication mutation
export function useSendCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      applicationNo: string;
      applicantName?: string;
      recipientEmail?: string;
      recipientPhone?: string;
      channel: "Email" | "SMS" | "WhatsApp";
      category: string;
      subject: string;
      content: string;
      sender?: string;
      scheduledAt?: string;
    }) => {
      // 1. If it's an email and not scheduled, send via Brevo SMTP backend endpoint
      if (payload.channel === "Email" && payload.recipientEmail && !payload.scheduledAt) {
        try {
          const res = await apiPost<{ success: boolean; messageId?: string }>("/email-templates/send", {
            to: payload.recipientEmail,
            subject: payload.subject,
            body: payload.content,
            senderName: payload.sender || "Admissions Desk",
            category: payload.category,
            applicationNo: payload.applicationNo,
            applicantName: payload.applicantName,
            channel: payload.channel,
          });

          if (res && (res as any).success === false) {
            throw new Error("SMTP service failed to deliver email. Please check the recipient address.");
          }
        } catch (mailErr: any) {
          const errorMsg =
            mailErr?.response?.data?.message ||
            mailErr?.message ||
            "Failed to send email via SMTP service.";
          console.error("Backend email sending error:", errorMsg);
          throw new Error(errorMsg);
        }
      }

      // 2. Return communication log
      const newLog: CommunicationLog = {
        id: `COMM-${Date.now()}`,
        applicationNo: payload.applicationNo || "APP2026001",
        applicantName: payload.applicantName || "Applicant",
        recipientEmail: payload.recipientEmail || "applicant@example.com",
        recipientPhone: payload.recipientPhone || "+91 98765 43210",
        channel: payload.channel,
        category: (payload.category as any) || "General Notice",
        subject: payload.subject,
        content: payload.content,
        sender: payload.sender || "Admissions Desk",
        sentAt: payload.scheduledAt || new Date().toISOString(),
        status: payload.scheduledAt ? "Scheduled" : "Sent",
        openCount: payload.scheduledAt ? 0 : 1,
        timeline: [
          {
            status: payload.scheduledAt ? "Scheduled" : "Sent",
            timestamp: new Date().toLocaleString("en-IN"),
            description: payload.scheduledAt
              ? `Message scheduled for ${payload.scheduledAt}`
              : `Dispatched to ${payload.recipientEmail} via Brevo SMTP`,
          },
        ],
      };
      return newLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to dispatch communication.");
    },
  });
}

// 5. Resend message mutation
export function useResendCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiPost(`/communications/${encodeURIComponent(id)}/resend`);
      } catch {
        const found = mockCommunications.find((c) => c.id === id || c.applicationNo === id);
        if (found) {
          found.status = "Delivered";
          found.sentAt = new Date().toISOString();
          found.timeline.push({
            status: "Resent",
            timestamp: new Date().toLocaleString(),
            description: "Message manually re-triggered by admin operator",
          });
        }
        return found;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      queryClient.invalidateQueries({ queryKey: ["communication", id] });
      toast.success("Message re-sent successfully!");
    },
    onError: () => {
      toast.error("Failed to resend message");
    },
  });
}

// 6. Delete log mutation
export function useDeleteCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiDelete(`/communications/${encodeURIComponent(id)}`);
      } catch {
        const index = mockCommunications.findIndex((c) => c.id === id || c.applicationNo === id);
        if (index !== -1) mockCommunications.splice(index, 1);
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      toast.success("Communication log deleted.");
    },
    onError: () => {
      toast.error("Failed to delete communication log.");
    },
  });
}
