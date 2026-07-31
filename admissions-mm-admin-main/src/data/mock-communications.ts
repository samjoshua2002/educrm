export interface CommunicationLog {
  id: string;
  applicationNo: string;
  applicantName: string;
  recipientEmail: string;
  recipientPhone: string;
  channel: "Email" | "SMS" | "WhatsApp";
  category: "Interview Schedule" | "Admission Offer" | "Payment Reminder" | "Document Request" | "Application Received" | "General Notice";
  subject: string;
  content: string;
  sender: string;
  sentAt: string;
  status: "Delivered" | "Sent" | "Opened" | "Scheduled" | "Failed";
  openCount?: number;
  lastOpenedAt?: string;
  deliveryTimeMs?: number;
  gatewayResponse?: string;
  ipAddress?: string;
  userAgent?: string;
  attachments?: { name: string; size: string; type: string }[];
  timeline: {
    status: string;
    timestamp: string;
    description: string;
  }[];
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  channel: "Email" | "SMS" | "WhatsApp";
  category: string;
  subject: string;
  body: string;
}

export const mockCommunicationTemplates: CommunicationTemplate[] = [
  {
    id: "TMPL-001",
    name: "GD & Interview Invitation",
    channel: "Email",
    category: "Interview Schedule",
    subject: "GD & Interview Invitation for {{Course_Name}} - {{Application_No}}",
    body: `Dear {{Applicant_Name}},

We are pleased to inform you that your application (No: {{Application_No}}) for {{Course_Name}} has passed the initial screening.

You are invited to attend the Group Discussion and Personal Interview session:
- Date: 12th February 2026
- Time: 10:00 AM IST
- Venue: Main Campus Auditorium / Online Portal

Please keep your original documents and ID proof ready.

Warm regards,
Admissions Team`,
  },
  {
    id: "TMPL-002",
    name: "Admission Offer Letter Notice",
    channel: "Email",
    category: "Admission Offer",
    subject: "Provisional Admission Offer Letter - {{Application_No}}",
    body: `Congratulations {{Applicant_Name}}!

We are delighted to offer you provisional admission to {{Course_Name}} for the upcoming academic session.

Please log in to your candidate portal to view your formal Admission Offer Letter and complete the fee acceptance payment before the deadline.

Best wishes,
Admissions Directorate`,
  },
  {
    id: "TMPL-003",
    name: "Application Fee Payment Reminder",
    channel: "SMS",
    category: "Payment Reminder",
    subject: "Application Fee Reminder",
    body: "Dear {{Applicant_Name}}, your application {{Application_No}} is pending submission. Complete fee payment at educrm.portal to secure your seat. Helpline: 1800-123-4567",
  },
  {
    id: "TMPL-004",
    name: "Document Verification WhatsApp Alert",
    channel: "WhatsApp",
    category: "Document Request",
    subject: "Pending Document Notice",
    body: "Hello {{Applicant_Name}}! 📄 Your Class 12 mark statement for application {{Application_No}} needs re-uploading. Please submit it by 5 PM today via your dashboard link.",
  },
];

export const mockCommunications: CommunicationLog[] = [
  {
    id: "COMM-2026-001",
    applicationNo: "APP2026001",
    applicantName: "Aarav Sharma",
    recipientEmail: "aarav.sharma@gmail.com",
    recipientPhone: "+91 98765 43210",
    channel: "Email",
    category: "Interview Schedule",
    subject: "GD & Interview Slot Confirmed - PGDM 2026-28",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #1E3A8A;">Group Discussion & Personal Interview Invitation</h2>
      <p>Dear <strong>Aarav Sharma</strong>,</p>
      <p>We are pleased to inform you that your application <strong>APP2026001</strong> for the <strong>PGDM (Two-Year, Full-Time)</strong> program has been shortlisted for the upcoming selection round.</p>
      <div style="background-color: #F8FAFC; border-left: 4px solid #2563EB; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Date:</strong> February 07, 2026</p>
        <p style="margin: 4px 0;"><strong>Time Slot:</strong> 02:30 PM - 04:30 PM IST</p>
        <p style="margin: 4px 0;"><strong>Location:</strong> Kochi Campus (Seminar Hall A)</p>
      </div>
      <p>Please bring a printed copy of your application form, admit card, government-issued photo ID, and original academic certificates.</p>
      <br/>
      <p>Best regards,<br/><strong>Admissions Committee</strong><br/>Educational Institutions Group</p>
    </div>`,
    sender: "Admissions Desk (Prof. R. Menon)",
    sentAt: "2026-02-01T10:30:00Z",
    status: "Opened",
    openCount: 3,
    lastOpenedAt: "2026-02-01T14:15:22Z",
    deliveryTimeMs: 1420,
    gatewayResponse: "250 2.0.0 OK 1706783400 s23-v62828392.mail.google.com",
    ipAddress: "157.48.12.98",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    attachments: [
      { name: "Interview_Admit_Card_APP2026001.pdf", size: "420 KB", type: "application/pdf" },
      { name: "Campus_Directions_Kochi.pdf", size: "1.2 MB", type: "application/pdf" },
    ],
    timeline: [
      { status: "Queued", timestamp: "2026-02-01 10:29:58 AM", description: "Message queued for delivery via AWS SES Provider" },
      { status: "Sent", timestamp: "2026-02-01 10:30:00 AM", description: "SMTP handoff successful (250 OK)" },
      { status: "Delivered", timestamp: "2026-02-01 10:30:02 AM", description: "Delivered to recipient mail server (aarav.sharma@gmail.com)" },
      { status: "Opened", timestamp: "2026-02-01 11:05:14 AM", description: "First opened on iOS Mobile Client" },
      { status: "Opened", timestamp: "2026-02-01 02:15:22 PM", description: "Re-opened on Desktop Chrome" },
    ],
  },
  {
    id: "COMM-2026-002",
    applicationNo: "APP2026002",
    applicantName: "Neha Gupta",
    recipientEmail: "neha.gupta@outlook.com",
    recipientPhone: "+91 98123 45678",
    channel: "WhatsApp",
    category: "Document Request",
    subject: "Document Re-upload Alert - Class XII Marksheet",
    content: "Hi Neha! 📄 We noticed your Class XII mark statement uploaded for application APP2026002 was slightly blurry. Please click here to re-upload a clear copy before tomorrow 5 PM: https://educrm.app/upload/APP2026002",
    sender: "Document Verification Bot",
    sentAt: "2026-02-01T11:45:00Z",
    status: "Delivered",
    openCount: 1,
    lastOpenedAt: "2026-02-01T11:46:10Z",
    deliveryTimeMs: 890,
    gatewayResponse: "WhatsApp Business API: Message delivered (status: 200)",
    ipAddress: "49.207.210.14",
    userAgent: "WhatsApp/2.24.2.74 A",
    timeline: [
      { status: "Queued", timestamp: "2026-02-01 11:44:58 AM", description: "Message formatted for Meta WhatsApp Cloud API" },
      { status: "Sent", timestamp: "2026-02-01 11:45:00 AM", description: "Dispatched to WhatsApp Gateway" },
      { status: "Delivered", timestamp: "2026-02-01 11:45:03 AM", description: "Double blue ticks received (Delivered & Read)" },
    ],
  },
  {
    id: "COMM-2026-003",
    applicationNo: "APP2026003",
    applicantName: "Rohan Patel",
    recipientEmail: "rohan.p@yahoo.com",
    recipientPhone: "+91 97654 32109",
    channel: "SMS",
    category: "Payment Reminder",
    subject: "Application Fee Deadline Notice",
    content: "Dear Rohan Patel, your application APP2026003 for MBA 2026 is pending fee submission. Today is the last date to complete payment and lock your preference.",
    sender: "SMS Gateway (TX-EDUCRM)",
    sentAt: "2026-02-01T09:15:00Z",
    status: "Delivered",
    deliveryTimeMs: 450,
    gatewayResponse: "DLT SMS Delivered: DLT_REQ_ID_9872134",
    timeline: [
      { status: "Queued", timestamp: "2026-02-01 09:14:55 AM", description: "Queued on Airtel DLT Gateway" },
      { status: "Sent", timestamp: "2026-02-01 09:15:00 AM", description: "SMS Sent to telecom circle" },
      { status: "Delivered", timestamp: "2026-02-01 09:15:02 AM", description: "Handset delivery confirmation received" },
    ],
  },
  {
    id: "COMM-2026-004",
    applicationNo: "APP2026004",
    applicantName: "Priya Reddy",
    recipientEmail: "priya.reddy@gmail.com",
    recipientPhone: "+91 96543 21098",
    channel: "Email",
    category: "Admission Offer",
    subject: "Provisional Admission Offer Letter - Executive PGDM",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #059669;">Congratulations Priya Reddy!</h2>
      <p>We are delighted to inform you that you have been selected for admission to the <strong>Executive PGDM</strong> program for the 2026 session at Chennai Campus.</p>
      <p>Please log in to your application dashboard to accept the offer and complete the commitment fee deposit by February 15, 2026.</p>
      <br/>
      <p>Warm Regards,<br/>Director of Admissions</p>
    </div>`,
    sender: "Admissions Directorate",
    sentAt: "2026-01-30T16:20:00Z",
    status: "Opened",
    openCount: 5,
    lastOpenedAt: "2026-01-31T18:30:11Z",
    deliveryTimeMs: 1150,
    gatewayResponse: "250 2.0.0 OK 1706631600 SES-Express",
    ipAddress: "103.22.45.12",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    attachments: [
      { name: "Offer_Letter_Priya_Reddy_APP2026004.pdf", size: "850 KB", type: "application/pdf" },
      { name: "Fee_Structure_2026.pdf", size: "620 KB", type: "application/pdf" },
    ],
    timeline: [
      { status: "Queued", timestamp: "2026-01-30 04:19:50 PM", description: "Queued for immediate dispatch" },
      { status: "Sent", timestamp: "2026-01-30 04:20:00 PM", description: "Sent via AWS SES" },
      { status: "Delivered", timestamp: "2026-01-30 04:20:03 PM", description: "Delivered to priya.reddy@gmail.com" },
      { status: "Opened", timestamp: "2026-01-30 04:35:10 PM", description: "Opened on macOS Safari" },
    ],
  },
  {
    id: "COMM-2026-005",
    applicationNo: "APP2026005",
    applicantName: "Vikram Singh",
    recipientEmail: "vikram.singh@invalid-domain-test.com",
    recipientPhone: "+91 95432 10987",
    channel: "Email",
    category: "Interview Schedule",
    subject: "GD & Interview Slot Reminder - B.Tech CSE",
    content: "Dear Vikram, your GD & Personal Interview has been scheduled for Feb 10th. Please confirm your attendance.",
    sender: "Admissions Desk",
    sentAt: "2026-01-29T14:10:00Z",
    status: "Failed",
    deliveryTimeMs: 3200,
    gatewayResponse: "550 5.1.1 The email account that you tried to reach does not exist.",
    ipAddress: "0.0.0.0",
    timeline: [
      { status: "Queued", timestamp: "2026-01-29 02:09:55 PM", description: "Queued for transmission" },
      { status: "Sent", timestamp: "2026-01-29 02:10:00 PM", description: "SMTP connection established" },
      { status: "Failed", timestamp: "2026-01-29 02:10:03 PM", description: "Hard bounce (550 Recipient Domain Not Found)" },
    ],
  },
  {
    id: "COMM-2026-006",
    applicationNo: "APP2026006",
    applicantName: "Ananya Iyer",
    recipientEmail: "ananya.iyer@gmail.com",
    recipientPhone: "+91 94321 09876",
    channel: "Email",
    category: "Application Received",
    subject: "Application Confirmation - APP2026006",
    content: "Dear Ananya, thank you for submitting your application for B.C.A (Hons.). Your application number is APP2026006.",
    sender: "System Automated Mailer",
    sentAt: "2026-02-02T09:00:00Z",
    status: "Scheduled",
    deliveryTimeMs: 0,
    timeline: [
      { status: "Scheduled", timestamp: "2026-02-01 06:00:00 PM", description: "Scheduled for automated dispatch at 09:00 AM" },
    ],
  },
];
