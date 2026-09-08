import { apiPost } from "@/lib/api";

export async function checkAndDispatchScheduledCommunications(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const raw = localStorage.getItem("educrm_communications_history");
    if (!raw) return false;

    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return false;

    const now = Date.now();
    let updated = false;

    for (const item of list) {
      if (item.status === "Scheduled") {
        const schedTime = new Date(item.sentAt).getTime();
        // If scheduled time has arrived or passed
        if (!isNaN(schedTime) && schedTime <= now) {
          console.log(`[Scheduled Dispatcher] Executing scheduled communication ${item.id} to ${item.recipientEmail}`);

          // 1. Dispatch actual email via backend Brevo SMTP endpoint
          if (item.recipientEmail && (item.channel === "Email" || !item.channel)) {
            try {
              await apiPost("/email-templates/send", {
                to: item.recipientEmail,
                subject: item.subject,
                body: item.content || item.subject,
                senderName: item.sender || "Admissions Desk",
                category: item.category || "General Notice",
                applicationNo: item.applicationNo,
                applicantName: item.applicantName,
                channel: item.channel || "Email",
              });
              console.log(`[Scheduled Dispatcher] Email dispatched to ${item.recipientEmail} via Brevo SMTP`);
            } catch (err) {
              console.error("[Scheduled Dispatcher] Failed to dispatch email via SMTP:", err);
            }
          }

          // 2. Transition status from Scheduled to Sent
          item.status = "Sent";
          item.timeline = [
            {
              status: "Sent",
              timestamp: new Date().toLocaleString("en-IN"),
              description: `Dispatched to ${item.recipientEmail} via Brevo SMTP (Scheduled execution)`,
            },
            ...(item.timeline || []),
          ];
          updated = true;
        }
      }
    }

    if (updated) {
      localStorage.setItem("educrm_communications_history", JSON.stringify(list));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("educrm_communications_updated"));
      return true;
    }
  } catch (e) {
    console.error("[Scheduled Dispatcher] Error processing:", e);
  }

  return false;
}
