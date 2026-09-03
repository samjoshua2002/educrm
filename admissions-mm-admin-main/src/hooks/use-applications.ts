import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

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
  verificationStatus?: string;
  appliedFor: string;
  courseId: string;
  interviewLocation?: string;
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
      documentUrl?: string;
    };
    twelfth: {
      institute: string;
      board: string;
      stream: string;
      year: string;
      percentage: string;
      documentUrl?: string;
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
      documentUrl?: string;
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
    presentPincode: string;
    permanent: string;
    permanentPincode: string;
  };
  other: {
    inspiration: string;
    source: string;
    medicalConditions: string;
    medicalConditionDocument?: string;
    hobbies?: string;
  };
  experience?: {
    claimedMonths?: string;
    validatedMonths?: string;
  };
  workExperiences?: Array<{
    companyName: string;
    designation: string;
    months: string;
    salaryCtc: string;
  }>;
  gdEvaluation?: {
    gdScore?: number;
    piScore?: number;
    interviewLocation?: string;
    interviewDate?: string;
    interviewTime?: string;
    confirmedCampus?: string;
    remarks?: string;
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
  verificationStatus?: string;
  verificationRemarks?: string | null;
  verifiedAt?: string | null;
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
  const graduation = educationRecords.find((r: any) => {
    if (!r || !r.level) return false;
    const l = r.level.toLowerCase();
    if (l.includes("10") || l.includes("tenth") || l.includes("12") || l.includes("twelfth")) return false;
    return true;
  });

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

  // Map entrance tests array → UI test rows (filter out empty/null entries)
  const entranceTestRecords: any[] = apiData.entranceTests || [];
  const mappedTests: EntranceTest[] = entranceTestRecords
    .filter((t: any) => {
      if (!t) return false;
      const roll = (t.rollNo || t.rollNumber || t.registrationNo || "").toString().trim();
      const score = (t.compositeScore != null ? t.compositeScore : t.score || "").toString().trim();
      const pct = (t.percentile != null ? t.percentile : "").toString().trim();
      return Boolean((roll && roll !== "-") || (score && score !== "-") || (pct && pct !== "-"));
    })
    .map((t: any) => ({
      exam: t.testName || t.exam || "-",
      rollNo: t.rollNo || t.rollNumber || t.registrationNo || "-",
      month: t.monthYear || t.month || "-",
      status: t.resultStatus || t.status || "-",
      score: t.compositeScore != null ? String(t.compositeScore) : t.score || "-",
      percentile: t.percentile != null ? String(t.percentile) : "-",
    }));

  const student = apiData.student || {};

  return {
    applicationNo: apiData.applicationNo,
    status: apiData.formStatus,
    verificationStatus: apiData.verificationStatus || "pending",
    appliedFor: apiData.program || "",
    courseId: apiData.courseId || "",
    applicant: {
      name: apiData.name || student.name || "",
      photo: apiData.photoUrl || apiData.photo || student.photo || "",
      email: apiData.email || student.email || "",
      primaryMobile: apiData.primaryMobile || student.phone || "",
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
      preference1: apiData.preference1Branch?.name || apiData.preference1 || "",
      preference2: apiData.preference2Branch?.name || apiData.preference2 || "",
    },
    entranceTests: mappedTests,
    education: {
      tenth: {
        institute: tenth?.institution || "",
        board: tenth?.boardUniversity || "",
        stream: tenth?.majorSubjects || "-",
        year: tenth?.yearOfPassing || "",
        percentage: tenth?.percentageCgpa || "",
        documentUrl: tenth?.documentUrl || tenth?.certificateUrl || "",
      },
      twelfth: {
        institute: twelfth?.institution || "",
        board: twelfth?.boardUniversity || "",
        stream: twelfth?.majorSubjects || "",
        year: twelfth?.yearOfPassing || "",
        percentage: twelfth?.percentageCgpa || "",
        documentUrl: twelfth?.documentUrl || twelfth?.certificateUrl || "",
      },
      graduation: {
        state: graduationState(graduation),
        university: graduation?.boardUniversity || "",
        college: graduation?.institution || "",
        degree: graduation?.degreeName || graduation?.level || "",
        mode: "Regular",
        status: graduation?.isCompleted ? "Completed" : "Ongoing",
        enrollmentYear: "",
        passingYear: graduation?.yearOfPassing || "",
        percentage: graduation?.percentageCgpa || "",
        percentageTillLast: graduation?.percentageCgpa || "",
        documentUrl: graduation?.documentUrl || graduation?.certificateUrl || "",
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
      present: presentAddr ? presentAddr.addressLine1 || "" : "",
      presentPincode: presentAddr ? presentAddr.pincode || "" : "",
      permanent: permanentAddr ? permanentAddr.addressLine1 || "" : "",
      permanentPincode: permanentAddr ? permanentAddr.pincode || "" : "",
    },
    other: {
      inspiration: apiData.inspirationEssay || "",
      source: apiData.howDidYouKnow || "",
      medicalConditions: apiData.hasMedicalCondition ? apiData.medicalConditionDetails || "Yes" : "None",
      medicalConditionDocument: apiData.medicalConditionDocument || apiData.medicalConditionDocumentUrl || "",
      hobbies: apiData.hobbies || "",
    },
    experience: {
      claimedMonths: apiData.claimedExperienceMonths || "",
      validatedMonths: apiData.validatedExperienceMonths || "",
    },
    workExperiences: (apiData.workExperienceRecords || apiData.workExperiences || []).map((e: any) => {
      const rawMonths = e.durationMonths != null ? String(e.durationMonths) : e.months ? String(e.months) : e.rolesResponsibilities ? String(e.rolesResponsibilities).replace(/[^0-9]/g, '') || String(e.rolesResponsibilities) : "";
      return {
        companyName: e.organization || e.companyName || e.company || "",
        designation: e.designation || "",
        months: rawMonths,
        salaryCtc: e.grossSalary || e.salaryCtc || "",
        fromDate: e.fromDate || e.from_date || "",
        toDate: e.toDate || e.to_date || "",
        rolesDescription: e.rolesResponsibilities || "",
      };
    }),
    gdEvaluation: {
      gdScore: apiData.gdScore ? parseFloat(apiData.gdScore) : undefined,
      piScore: apiData.piScore ? parseFloat(apiData.piScore) : undefined,
      interviewLocation: apiData.interviewLocation || "",
      interviewDate: apiData.interviewDate ? String(apiData.interviewDate).split('T')[0] : "",
      interviewTime: apiData.interviewTime || "",
      confirmedCampus: apiData.confirmedCampus || "",
      remarks: apiData.evaluationRemarks || "",
    },
    interviewLocation: apiData.interviewLocation || "",
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
    email: updatedData.applicant.email,
    primaryMobile: updatedData.applicant.primaryMobile,
    alternateMobile: updatedData.applicant.alternateMobile,
    gender: updatedData.applicant.gender,
    dateOfBirth: parseDobToISO(updatedData.applicant.dob),
    religion: updatedData.applicant.religion,
    nationality: updatedData.applicant.nationality,
    aadhaarNumber: updatedData.applicant.aadhaar,
    category: updatedData.applicant.category,
    maritalStatus: updatedData.applicant.maritalStatus,
    photoUrl: updatedData.applicant.photo || (updatedData as any).photoUrl || undefined,
  };
}

function toContactPayload(updatedData: ApplicationDetail) {
  // Contact form edits primaryMobile, alternateMobile, and addresses
  const records = [];
  if (updatedData.address.present) {
    records.push({
      type: "present",
      addressLine1: updatedData.address.present,
      pincode: updatedData.address.presentPincode || undefined,
    });
  }
  if (updatedData.address.permanent) {
    records.push({
      type: "permanent",
      addressLine1: updatedData.address.permanent,
      pincode: updatedData.address.permanentPincode || undefined,
    });
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
    courseId: updatedData.courseId || undefined,
    interviewLocation: updatedData.interviewLocation || undefined,
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
      documentUrl: e.tenth.documentUrl || undefined,
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
      documentUrl: e.twelfth.documentUrl || undefined,
      isCompleted: true,
    });
  }
  if (e.graduation) {
    records.push({
      level: "UG",
      degreeName: e.graduation.degree || undefined,
      institution: e.graduation.college || "College",
      boardUniversity: e.graduation.university || "University",
      yearOfPassing: e.graduation.passingYear || "2025",
      percentageCgpa: e.graduation.percentageTillLast || e.graduation.percentage || "0",
      documentUrl: e.graduation.documentUrl || undefined,
      isCompleted: e.graduation.status === "Completed",
    });
  }
  return { records };
}

function toEntranceTestsPayload(updatedData: ApplicationDetail) {
  return {
    records: updatedData.entranceTests.map((t) => ({
      testName: t.exam,
      rollNo: t.rollNo !== "-" && t.rollNo ? t.rollNo : undefined,
      monthYear: t.month !== "-" && t.month ? t.month : undefined,
      resultStatus: t.status !== "-" && t.status ? t.status : undefined,
      compositeScore: t.score !== "-" && t.score ? Number(t.score) : undefined,
      percentile: t.percentile !== "-" && t.percentile ? Number(t.percentile) : undefined,
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
    medicalConditionDocument: hasMedical ? updatedData.other.medicalConditionDocument : undefined,
    hobbies: updatedData.other.hobbies || undefined,
  };
}

function toWorkExperiencePayload(updatedData: ApplicationDetail) {
  const exps = updatedData.workExperiences || (updatedData as any).experiences || [];
  const records = exps
    .filter((e: any) => e && (e.companyName || e.organization || e.company || e.fromDate || e.toDate))
    .map((e: any) => {
      return {
        organization: String(e.companyName || e.organization || e.company || "Company").trim(),
        designation: String(e.designation || "").trim() || undefined,
        fromDate: e.fromDate || e.from_date || undefined,
        toDate: e.toDate || e.to_date || undefined,
        rolesResponsibilities: String(e.rolesDescription || e.rolesResponsibilities || "").trim() || undefined,
        grossSalary: String(e.salaryCtc || e.salary || e.grossSalary || "").trim() || undefined,
      };
    });
  return {
    records,
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
export function useApplications(
  page = 1,
  limit = 20,
  search?: string,
  status?: string,
  verificationStatus?: string,
) {
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.role === "student";

  return useQuery({
    queryKey: ["applications", page, limit, search, status, verificationStatus],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (status && status !== "all") params.status = status;
      if (verificationStatus && verificationStatus !== "all") params.verificationStatus = verificationStatus;
      return apiGet<{ data: Application[]; pagination: any }>("/applications", params);
    },
    enabled: !isStudent,
  });
}

// 2. Fetch single application details
export function useApplication(applicationNo: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["application", applicationNo],
    queryFn: async () => {
      const encodedNo = encodeURIComponent(applicationNo);
      const raw = await apiGet<any>(`/applications/${encodedNo}`);
      return mapApiToApplicationDetail(raw);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!applicationNo,
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
      section: "personal" | "preferences" | "education" | "entrance" | "parents" | "additional" | "contact" | "experience";
      data: ApplicationDetail;
    }) => {
      const encodedNo = encodeURIComponent(applicationNo);
      const base = `/applications/${encodedNo}`;

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
        case "experience":
          return apiPatch(`${base}/work-experience`, toWorkExperiencePayload(data));
        default:
          throw new Error(`Unknown section: ${section}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(["application", variables.applicationNo], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ...variables.data,
        };
      });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: ["application", variables.applicationNo],
      });
      queryClient.invalidateQueries({ queryKey: ["active-application"] });
      toast.success("Application details updated successfully");
    },
    onError: (err: any) => {
      const responseData = err?.response?.data;
      let msg = "Failed to update application details";

      if (responseData?.errors && typeof responseData.errors === "object") {
        const errValues = Object.values(responseData.errors).filter(Boolean);
        if (errValues.length > 0) {
          msg = errValues.join(", ");
        }
      } else if (responseData?.message) {
        msg = Array.isArray(responseData.message)
          ? responseData.message.join(", ")
          : responseData.message;
      } else if (err?.message) {
        msg = err.message;
      }

      console.error("[useUpdateApplication] Error:", msg, responseData || err);
      toast.error(msg);
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
      const encodedNo = encodeURIComponent(applicationNo);
      return apiPatch(`/applications/${encodedNo}/status`, { status });
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

// 4b. Verify / reject an application (org_admin & application_manager only)
export function useVerifyApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationNo,
      status,
      remarks,
    }: {
      applicationNo: string;
      status: "verified" | "rejected";
      remarks?: string;
    }) => {
      const encodedNo = encodeURIComponent(applicationNo);
      return apiPatch(`/applications/${encodedNo}/verify`, { status, remarks });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: ["application", variables.applicationNo],
      });
      toast.success(
        variables.status === "verified"
          ? "Application verified successfully"
          : "Application rejected",
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update verification status");
    },
  });
}

// 5. Submit application (locks editing)
export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: string | { applicationNo: string; password?: string }) => {
      const applicationNo = typeof payload === "string" ? payload : payload.applicationNo;
      const password = typeof payload === "string" ? undefined : payload.password;
      const encodedNo = encodeURIComponent(applicationNo);
      return apiPatch(`/applications/${encodedNo}/submit`, password ? { password } : undefined);
    },
    onSuccess: (_, payload) => {
      const applicationNo = typeof payload === "string" ? payload : payload.applicationNo;
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["application", applicationNo] });
      toast.success("Application submitted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to submit application");
    },
  });
}

// Legacy compatibility alias (used by applications list page for delete action)
// Since the backend does not have a delete endpoint in this module, we keep
// this as a no-op and disable the button or show a not-supported message.
export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const encodedId = encodeURIComponent(id);
      return apiDelete<any>(`/applications/${encodedId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application deleted successfully");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Failed to delete application";
      toast.error(msg);
    },
  });
}

// 6. Create application
export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      return apiPost<any>("/applications", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application created successfully");
    },
    onError: (err: any) => {
      const responseData = err?.response?.data;
      const backendMsg = responseData?.message || err?.message;
      const msg = Array.isArray(backendMsg)
        ? backendMsg.join(", ")
        : typeof backendMsg === "string"
        ? backendMsg
        : "Failed to create application";
      console.error("[useCreateApplication] Error:", msg, responseData || err);
      toast.error(msg);
    },
  });
}

// Legacy alias kept for backward compat with applications list page
export function useUpdateApplicationSummary() {
  return useUpdateApplicationStatus();
}

export function useUpdateGdEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationNo,
      data,
    }: {
      applicationNo: string;
      data: {
        gdScore?: number;
        piScore?: number;
        interviewLocation?: string;
        interviewDate?: string;
        interviewTime?: string;
        confirmedCampus?: string;
        remarks?: string;
        status?: string;
        claimedMonths?: string;
        validatedMonths?: string;
      };
    }) => {
      const encodedNo = encodeURIComponent(applicationNo);
      return apiPatch(`/applications/${encodedNo}/gd-evaluation`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["application", variables.applicationNo] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Evaluation saved to database!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save evaluation");
    },
  });
}

// 7. Fetch active application for currently logged-in student
export function useActiveApplication(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["active-application"],
    queryFn: async () => {
      try {
        const raw = await apiGet<any>("/applications/my/active");
        return mapApiToApplicationDetail(raw);
      } catch (err: any) {
        if (err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: options?.enabled,
  });
}

