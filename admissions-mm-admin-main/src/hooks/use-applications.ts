import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";

// ============================================================================
// TYPES
// ============================================================================

export interface EntranceTest {
  exam: string;
  rollNo: string;
  month: string;
  status: string;
  score: string;
  percentile: string;
}

export interface ApplicationDetail {
  applicationNo: string;
  status: string;
  appliedFor: string;
  applicant: {
    name: string;
    photo: string;
    email: string;
    primaryMobile: string;
    alternateMobile: string;
    gender: string;
    dob: string;
    age: string;
    religion: string;
    nationality: string;
    aadhaar: string;
    category: string;
    maritalStatus: string;
  };
  preferences: {
    preference1: string; // branch UUID
    preference2: string; // branch UUID
  };
  entranceTests: EntranceTest[];
  education: {
    tenth: {
      institute: string;
      board: string;
      stream: string;
      year: string;
      percentage: string;
    };
    twelfth: {
      institute: string;
      board: string;
      stream: string;
      year: string;
      percentage: string;
    };
    graduation: {
      state: string;
      university: string;
      college: string;
      degree: string;
      mode: string;
      status: string;
      enrollmentYear: string;
      passingYear: string;
      percentage: string;
      percentageTillLast: string;
    };
  };
  parents: {
    father: {
      name: string;
      mobile: string;
      email: string;
      occupation: string;
      income: string;
    };
    mother: {
      name: string;
      mobile: string;
      email: string;
      occupation: string;
      income: string;
    };
  };
  address: {
    present: string;
    permanent: string;
  };
  other: {
    inspiration: string;
    source: string;
    medicalConditions: string;
  };
}

export interface Application {
  id: string;
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
}

// ============================================================================
// API RESPONSE → UI SHAPE ADAPTER
// Transforms the backend's normalized, relational data into the flat nested
// object structure expected by all UI form components.
// ============================================================================

function mapApiToApplicationDetail(apiData: any): ApplicationDetail {
  // Map education records array → nested tenth/twelfth/graduation objects
  const educationRecords: any[] = apiData.educationRecords || [];
  const tenth = educationRecords.find((r: any) =>
    r.level?.toLowerCase().includes("10") || r.level?.toLowerCase() === "tenth"
  );
  const twelfth = educationRecords.find((r: any) =>
    r.level?.toLowerCase().includes("12") || r.level?.toLowerCase() === "twelfth"
  );
  const graduation = educationRecords.find((r: any) =>
    r.level?.toLowerCase().includes("graduat") ||
    r.level?.toLowerCase() === "ug" ||
    r.level?.toLowerCase() === "bachelor"
  );

  // Map parent records array → father/mother objects
  const parentRecords: any[] = apiData.parentRecords || [];
  const father = parentRecords.find((p: any) => p.relationship?.toLowerCase() === "father");
  const mother = parentRecords.find((p: any) => p.relationship?.toLowerCase() === "mother");

  // Map address records array → present/permanent strings
  const addressRecords: any[] = apiData.addressRecords || [];
  const presentAddr = addressRecords.find((a: any) => a.type?.toLowerCase() === "present");
  const permanentAddr = addressRecords.find((a: any) => a.type?.toLowerCase() === "permanent");

  function formatAddress(addr: any): string {
    if (!addr) return "";
    return [addr.addressLine1, addr.addressLine2, addr.city, addr.district, addr.state, addr.pincode]
      .filter(Boolean)
      .join(", ");
  }

  // Map entrance tests array → UI test rows
  const entranceTestRecords: any[] = apiData.entranceTests || [];
  const mappedTests: EntranceTest[] = entranceTestRecords.map((t: any) => ({
    exam: t.testName,
    rollNo: t.rollNo || "-",
    month: t.monthYear || "-",
    status: t.resultStatus || "-",
    score: t.compositeScore != null ? String(t.compositeScore) : "-",
    percentile: t.percentile != null ? String(t.percentile) : "-",
  }));

  const student = apiData.student || {};

  return {
    applicationNo: apiData.applicationNo,
    status: apiData.formStatus,
    appliedFor: apiData.program || "",
    applicant: {
      name: student.name || apiData.name || "",
      photo: "",
      email: student.email || apiData.email || "",
      primaryMobile: student.phone || apiData.primaryMobile || "",
      alternateMobile: apiData.alternateMobile || "",
      gender: apiData.gender || "",
      dob: apiData.dateOfBirth ? new Date(apiData.dateOfBirth).toLocaleDateString("en-IN") : "",
      age: apiData.dateOfBirth
        ? String(new Date().getFullYear() - new Date(apiData.dateOfBirth).getFullYear()) + " Years"
        : "",
      religion: apiData.religion || "",
      nationality: apiData.nationality || "Indian",
      aadhaar: apiData.aadhaarNumber || "",
      category: apiData.category || "",
      maritalStatus: apiData.maritalStatus || "",
    },
    preferences: {
      preference1: apiData.preference1 || "",
      preference2: apiData.preference2 || "",
    },
    entranceTests: mappedTests,
    education: {
      tenth: {
        institute: tenth?.institution || "",
        board: tenth?.boardUniversity || "",
        stream: tenth?.majorSubjects || "-",
        year: tenth?.yearOfPassing || "",
        percentage: tenth?.percentageCgpa || "",
      },
      twelfth: {
        institute: twelfth?.institution || "",
        board: twelfth?.boardUniversity || "",
        stream: twelfth?.majorSubjects || "",
        year: twelfth?.yearOfPassing || "",
        percentage: twelfth?.percentageCgpa || "",
      },
      graduation: {
        state: graduationState(graduation),
        university: graduation?.boardUniversity || "",
        college: graduation?.institution || "",
        degree: graduation?.level || "",
        mode: "Regular",
        status: graduation?.isCompleted ? "Completed" : "Ongoing",
        enrollmentYear: "",
        passingYear: graduation?.yearOfPassing || "",
        percentage: graduation?.percentageCgpa || "",
        percentageTillLast: graduation?.percentageCgpa || "",
      },
    },
    parents: {
      father: {
        name: father?.name || "",
        mobile: father?.phone || "",
        email: father?.email || "",
        occupation: father?.occupation || "",
        income: father?.annualIncome || "",
      },
      mother: {
        name: mother?.name || "",
        mobile: mother?.phone || "",
        email: mother?.email || "",
        occupation: mother?.occupation || "",
        income: mother?.annualIncome || "",
      },
    },
    address: {
      present: formatAddress(presentAddr),
      permanent: formatAddress(permanentAddr),
    },
    other: {
      inspiration: apiData.inspirationEssay || "",
      source: apiData.howDidYouKnow || "",
      medicalConditions: apiData.hasMedicalCondition ? apiData.medicalConditionDetails || "Yes" : "None",
    },
  };
}

function graduationState(_grad: any): string {
  return "";
}

// ============================================================================
// UI Detail → Section Patch Payload Transformers
// Each transform function extracts only the relevant fields for each PATCH endpoint.
// ============================================================================

function toPersonalPayload(updatedData: ApplicationDetail) {
  return {
    name: updatedData.applicant.name,
    primaryMobile: updatedData.applicant.primaryMobile,
    alternateMobile: updatedData.applicant.alternateMobile,
    gender: updatedData.applicant.gender,
    dateOfBirth: parseDobToISO(updatedData.applicant.dob),
    religion: updatedData.applicant.religion,
    nationality: updatedData.applicant.nationality,
    aadhaarNumber: updatedData.applicant.aadhaar,
    category: updatedData.applicant.category,
    maritalStatus: updatedData.applicant.maritalStatus,
  };
}

function toContactPayload(updatedData: ApplicationDetail) {
  // Contact form edits primaryMobile, alternateMobile, and addresses
  const records = [];
  if (updatedData.address.present) {
    records.push({ type: "present", addressLine1: updatedData.address.present });
  }
  if (updatedData.address.permanent) {
    records.push({ type: "permanent", addressLine1: updatedData.address.permanent });
  }
  return {
    addresses: records,
    primaryMobile: updatedData.applicant.primaryMobile,
    alternateMobile: updatedData.applicant.alternateMobile,
  };
}

function toPreferencesPayload(updatedData: ApplicationDetail) {
  return {
    preference1: updatedData.preferences.preference1 || undefined,
    preference2: updatedData.preferences.preference2 || undefined,
  };
}

function toEducationPayload(updatedData: ApplicationDetail) {
  const records = [];
  const e = updatedData.education;
  if (e.tenth.institute || e.tenth.board) {
    records.push({
      level: "10th",
      institution: e.tenth.institute,
      boardUniversity: e.tenth.board,
      majorSubjects: e.tenth.stream,
      yearOfPassing: e.tenth.year,
      percentageCgpa: e.tenth.percentage,
      isCompleted: true,
    });
  }
  if (e.twelfth.institute || e.twelfth.board) {
    records.push({
      level: "12th",
      institution: e.twelfth.institute,
      boardUniversity: e.twelfth.board,
      majorSubjects: e.twelfth.stream,
      yearOfPassing: e.twelfth.year,
      percentageCgpa: e.twelfth.percentage,
      isCompleted: true,
    });
  }
  if (e.graduation.college || e.graduation.university) {
    records.push({
      level: e.graduation.degree || "UG",
      institution: e.graduation.college,
      boardUniversity: e.graduation.university,
      yearOfPassing: e.graduation.passingYear,
      percentageCgpa: e.graduation.percentage,
      isCompleted: e.graduation.status === "Completed",
    });
  }
  return { records };
}

function toEntranceTestsPayload(updatedData: ApplicationDetail) {
  return {
    records: updatedData.entranceTests.map((t) => ({
      testName: t.exam,
      monthYear: t.month !== "-" ? t.month : undefined,
      compositeScore: t.score !== "-" ? Number(t.score) : undefined,
      percentile: t.percentile !== "-" ? Number(t.percentile) : undefined,
    })),
  };
}

function toParentsPayload(updatedData: ApplicationDetail) {
  const records = [];
  if (updatedData.parents.father.name) {
    records.push({
      relationship: "father",
      name: updatedData.parents.father.name,
      phone: updatedData.parents.father.mobile,
      email: updatedData.parents.father.email,
      occupation: updatedData.parents.father.occupation,
      annualIncome: updatedData.parents.father.income,
    });
  }
  if (updatedData.parents.mother.name) {
    records.push({
      relationship: "mother",
      name: updatedData.parents.mother.name,
      phone: updatedData.parents.mother.mobile,
      email: updatedData.parents.mother.email,
      occupation: updatedData.parents.mother.occupation,
      annualIncome: updatedData.parents.mother.income,
    });
  }
  return { records };
}

function toAdditionalPayload(updatedData: ApplicationDetail) {
  const hasMedical =
    updatedData.other.medicalConditions &&
    updatedData.other.medicalConditions.toLowerCase() !== "none";
  return {
    inspirationEssay: updatedData.other.inspiration,
    howDidYouKnow: updatedData.other.source,
    hasMedicalCondition: hasMedical,
    medicalConditionDetails: hasMedical ? updatedData.other.medicalConditions : undefined,
  };
}

function parseDobToISO(dob: string): string | undefined {
  if (!dob) return undefined;
  // Handle formats like "25/05/2005" or "2005-05-25"
  if (dob.includes("/")) {
    const [day, month, year] = dob.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return dob;
}

// ============================================================================
// HOOKS
// ============================================================================

// 1. Fetch all applications (paginated)
export function useApplications(page = 1, limit = 20, search?: string, status?: string) {
  return useQuery({
    queryKey: ["applications", page, limit, search, status],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (status && status !== "all") params.status = status;
      return apiGet<{ data: Application[]; pagination: any }>("/applications", params);
    },
  });
}

// 2. Fetch single application details
export function useApplication(applicationNo: string) {
  return useQuery({
    queryKey: ["application", applicationNo],
    queryFn: async () => {
      // The detail endpoint uses applicationNo as path param
      const raw = await apiGet<any>(`/applications/${applicationNo}`);
      return mapApiToApplicationDetail(raw);
    },
    enabled: !!applicationNo,
  });
}

// 3. Update application details — routes to the correct section PATCH endpoint
export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationNo,
      section,
      data,
    }: {
      applicationNo: string;
      section: "personal" | "preferences" | "education" | "entrance" | "parents" | "additional" | "contact";
      data: ApplicationDetail;
    }) => {
      const base = `/applications/${applicationNo}`;

      switch (section) {
        case "personal":
          return apiPatch(`${base}/personal`, toPersonalPayload(data));
        case "contact": {
          // Contact updates personal (mobile) AND addresses (two separate endpoints)
          const { addresses, ...personalFields } = toContactPayload(data);
          await apiPatch(`${base}/personal`, personalFields);
          return apiPatch(`${base}/addresses`, { records: addresses });
        }
        case "preferences":
          return apiPatch(`${base}/preferences`, toPreferencesPayload(data));
        case "education":
          return apiPatch(`${base}/education`, toEducationPayload(data));
        case "entrance":
          return apiPatch(`${base}/entrance-tests`, toEntranceTestsPayload(data));
        case "parents":
          return apiPatch(`${base}/parents`, toParentsPayload(data));
        case "additional":
          return apiPatch(`${base}/additional-info`, toAdditionalPayload(data));
        default:
          throw new Error(`Unknown section: ${section}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: ["application", variables.applicationNo],
      });
      toast.success("Application details updated successfully");
    },
    onError: () => {
      toast.error("Failed to update application details");
    },
  });
}

// 4. Update application status (managers/admins only)
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationNo,
      status,
    }: {
      applicationNo: string;
      status: string;
    }) => {
      return apiPatch(`/applications/${applicationNo}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: ["application", variables.applicationNo],
      });
      toast.success("Application status updated successfully");
    },
    onError: () => {
      toast.error("Failed to update application status");
    },
  });
}

// 5. Submit application (locks editing)
export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationNo: string) => {
      return apiPatch(`/applications/${applicationNo}/submit`);
    },
    onSuccess: (_, applicationNo) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["application", applicationNo] });
      toast.success("Application submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit application");
    },
  });
}

// Legacy compatibility alias (used by applications list page for delete action)
// Since the backend does not have a delete endpoint in this module, we keep
// this as a no-op and disable the button or show a not-supported message.
export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_id: string) => {
      // Delete is not supported in the application module per the business rules.
      throw new Error("Deleting applications is not supported.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: () => {
      toast.error("Deleting applications is not permitted by policy.");
    },
  });
}

// Legacy alias kept for backward compat with applications list page
export function useUpdateApplicationSummary() {
  return useUpdateApplicationStatus();
}
