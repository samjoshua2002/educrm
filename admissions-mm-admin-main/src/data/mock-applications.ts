import { gdInterviews } from "./mock-gd-interviews";

export type Application = {
  id: number | string;
  applicationNo: string;
  name: string;
  email: string;
  phone: string;
  formStatus: string;
  paymentStatus: string;
  paymentMode: string;
  paymentAmount: number;
  lastActivity: string;
  program: string;
  campus: string;
};

export const applications: Application[] = [
  {
    id: 1,
    applicationNo: "APP-2026-0001",
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    phone: "+91 98765 43210",
    formStatus: "Submitted",
    paymentStatus: "Paid",
    paymentMode: "Online",
    paymentAmount: 1500,
    lastActivity: "2026-02-18",
    program: "B.Tech Computer Science",
    campus: "Main Campus",
  },
  {
    id: 2,
    applicationNo: "APP-2026-0002",
    name: "Sneha Iyer",
    email: "sneha.iyer@example.com",
    phone: "+91 91234 56780",
    formStatus: "In Progress",
    paymentStatus: "Pending",
    paymentMode: "—",
    paymentAmount: 0,
    lastActivity: "2026-02-17",
    program: "MBA Finance",
    campus: "City Campus",
  },
  {
    id: 3,
    applicationNo: "APP-2026-0003",
    name: "Rohan Desai",
    email: "rohan.desai@example.com",
    phone: "+91 99876 54321",
    formStatus: "Submitted",
    paymentStatus: "Paid",
    paymentMode: "UPI",
    paymentAmount: 1500,
    lastActivity: "2026-02-16",
    program: "B.Sc Physics",
    campus: "South Campus",
  },
  {
    id: 4,
    applicationNo: "APP-2026-0004",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phone: "+91 87654 32109",
    formStatus: "Under Review",
    paymentStatus: "Paid",
    paymentMode: "Net Banking",
    paymentAmount: 2000,
    lastActivity: "2026-02-15",
    program: "M.Tech AI & ML",
    campus: "Main Campus",
  },
  {
    id: 5,
    applicationNo: "APP-2026-0005",
    name: "Karan Singh",
    email: "karan.singh@example.com",
    phone: "+91 90123 45678",
    formStatus: "Incomplete",
    paymentStatus: "Pending",
    paymentMode: "—",
    paymentAmount: 0,
    lastActivity: "2026-02-14",
    program: "BBA",
    campus: "City Campus",
  },
  {
    id: 6,
    applicationNo: "APP-2026-0006",
    name: "Ananya Sharma",
    email: "ananya.sharma@example.com",
    phone: "+91 78901 23456",
    formStatus: "Submitted",
    paymentStatus: "Paid",
    paymentMode: "Credit Card",
    paymentAmount: 1500,
    lastActivity: "2026-02-13",
    program: "B.Tech Electronics",
    campus: "South Campus",
  },
  {
    id: 7,
    applicationNo: "APP-2026-0007",
    name: "Vikram Joshi",
    email: "vikram.joshi@example.com",
    phone: "+91 81234 56789",
    formStatus: "Rejected",
    paymentStatus: "Refunded",
    paymentMode: "Online",
    paymentAmount: 1500,
    lastActivity: "2026-02-12",
    program: "MBA Marketing",
    campus: "Main Campus",
  },
  {
    id: 8,
    applicationNo: "APP-2026-0008",
    name: "Meera Gupta",
    email: "meera.gupta@example.com",
    phone: "+91 92345 67890",
    formStatus: "Accepted",
    paymentStatus: "Paid",
    paymentMode: "Debit Card",
    paymentAmount: 2000,
    lastActivity: "2026-02-11",
    program: "B.Sc Mathematics",
    campus: "City Campus",
  },
  {
    id: 9,
    applicationNo: "APP-2026-0009",
    name: "Arjun Patel",
    email: "arjun.patel@example.com",
    phone: "+91 85678 90123",
    formStatus: "Submitted",
    paymentStatus: "Paid",
    paymentMode: "UPI",
    paymentAmount: 1500,
    lastActivity: "2026-02-10",
    program: "B.Tech Mechanical",
    campus: "South Campus",
  },
  {
    id: 10,
    applicationNo: "APP-2026-0010",
    name: "Diya Reddy",
    email: "diya.reddy@example.com",
    phone: "+91 93456 78901",
    formStatus: "In Progress",
    paymentStatus: "Pending",
    paymentMode: "—",
    paymentAmount: 0,
    lastActivity: "2026-02-09",
    program: "M.Tech Data Science",
    campus: "Main Campus",
  },
  {
    id: 11,
    applicationNo: "APP-2026-0011",
    name: "Ishaan Kumar",
    email: "ishaan.kumar@example.com",
    phone: "+91 76543 21098",
    formStatus: "Under Review",
    paymentStatus: "Paid",
    paymentMode: "Net Banking",
    paymentAmount: 2000,
    lastActivity: "2026-02-08",
    program: "BBA",
    campus: "City Campus",
  },
  {
    id: 12,
    applicationNo: "APP-2026-0012",
    name: "Tanya Bose",
    email: "tanya.bose@example.com",
    phone: "+91 88765 43210",
    formStatus: "Accepted",
    paymentStatus: "Paid",
    paymentMode: "Online",
    paymentAmount: 1500,
    lastActivity: "2026-02-07",
    program: "B.Tech Computer Science",
    campus: "Main Campus",
  },
  {
    id: 13,
    applicationNo: "APP-2026-0013",
    name: "SAMTESTING",
    email: "[EMAIL_ADDRESS]",
    phone: "+91 9944154193",
    formStatus: "Submitted",
    paymentStatus: "Paid",
    paymentMode: "Online",
    paymentAmount: 1500,
    lastActivity: "2026-02-07",
    program: "B.Tech Computer Science",
    campus: "Main Campus",
  },
];

export function getApplicationData(applicationNo: string) {
  const app = applications.find((a) => a.applicationNo === applicationNo);
  if (!app) return null;

  const isFemale =
    app.name.includes("Sneha") ||
    app.name.includes("Priya") ||
    app.name.includes("Ananya") ||
    app.name.includes("Meera") ||
    app.name.includes("Diya") ||
    app.name.includes("Tanya") ||
    app.name.includes("Anbukarasi");

  return {
    applicationNo: app.applicationNo,
    status: app.formStatus === "Submitted" ? "Review Pending" : app.formStatus,
    appliedFor: app.program + " 2026-27",
    applicant: {
      name: app.name,
      photo: `https://i.pravatar.cc/150?u=${app.id}`,
      email: app.email,
      primaryMobile: app.phone,
      alternateMobile: "+91-9444971643",
      gender: isFemale ? "Female" : "Male",
      dob: isFemale ? "12/08/2005" : "25/05/2005",
      age: "20 Years",
      religion: "Hinduism",
      nationality: "Indian",
      aadhaar: "8719 5139 2943",
      category: isFemale ? "OBC" : "GEN",
      maritalStatus: "Unmarried",
    },
    preferences: {
      preference1: app.campus,
      preference2: app.campus.includes("Main") ? "City Campus" : "Main Campus",
    },
    entranceTests: [
      {
        exam: "XAT",
        rollNo: "-",
        month: "-",
        status: "-",
        score: "-",
        percentile: "-",
      },
      {
        exam: "CAT",
        rollNo: "CAT2025102",
        month: "11/2025",
        status: "Declared",
        score: "-",
        percentile: "88.22",
      },
      {
        exam: "CMAT",
        rollNo: "-",
        month: "-",
        status: "-",
        score: "-",
        percentile: "-",
      },
    ],
    education: {
      tenth: {
        institute: "St. Xavier's High School",
        board: "CBSE",
        stream: "-",
        year: "2020",
        percentage: "84%",
      },
      twelfth: {
        institute: "St. Xavier's Junior College",
        board: "HSC Board",
        stream: isFemale ? "Commerce" : "Science",
        year: "2022",
        percentage: "91.2%",
      },
      graduation: {
        state: "Maharashtra",
        university: "Mumbai University",
        college: "K.J. Somaiya College",
        degree: app.program.startsWith("B.Tech") ? "B.Tech" : "B.Sc",
        mode: "Regular",
        status: "Completed",
        enrollmentYear: "2022",
        passingYear: "2025",
        percentage: "82%",
        percentageTillLast: "82%",
      },
    },
    parents: {
      father: {
        name: `Mr. ${app.name.split(" ")[1] || "Mehta"}`,
        mobile: "+91-9789886430",
        email: "-",
        occupation: "Business",
        income: "5,00,000-10,00,000",
      },
      mother: {
        name: `Mrs. ${app.name.split(" ")[1] || "Mehta"}`,
        mobile: "+91-9789883968",
        email: "-",
        occupation: "Homemaker",
        income: "-",
      },
    },
    address: {
      present:
        "Flat 402, Green Valley Apartments, Andheri West, Mumbai - 400053",
      permanent:
        "Flat 402, Green Valley Apartments, Andheri West, Mumbai - 400053",
    },
    other: {
      inspiration:
        "I believe this course will significantly enhance my career. The strong industry connections and focus on practical learning is what draws me here.",
      source: "Education Portals",
      medicalConditions: "None",
    },
  };
}

// Sync gdInterviews changes into applications
if (typeof gdInterviews !== "undefined" && Array.isArray(gdInterviews)) {
  gdInterviews.forEach((gd) => {
    const app = applications.find((a) => a.id === gd.id);
    if (app) {
      app.applicationNo = gd.applicationNo;
      app.name = gd.name;
      app.email = gd.email;
      app.phone = gd.phone;
    }
  });
}
