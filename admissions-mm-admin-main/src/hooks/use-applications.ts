import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  applications as initialApplications,
  getApplicationData,
} from "@/data/mock-applications";
import { type Application } from "@/data/mock-applications";

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
    preference1: string;
    preference2: string;
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

// Local storage helper keys
const APPLICATIONS_KEY = "admissions_applications_list";
const APPLICATION_DETAILS_KEY_PREFIX = "admissions_application_detail_";

export function getStoredApplications(): Application[] {
  if (typeof window === "undefined") return initialApplications;
  const stored = localStorage.getItem(APPLICATIONS_KEY);
  if (!stored) {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(initialApplications));
    return initialApplications;
  }
  const storedList = JSON.parse(stored) as Application[];
  let changed = false;
  initialApplications.forEach((initialApp) => {
    const idx = storedList.findIndex((a) => a.id === initialApp.id);
    if (idx !== -1) {
      const storedApp = storedList[idx];
      if (
        storedApp.applicationNo !== initialApp.applicationNo ||
        storedApp.name !== initialApp.name ||
        storedApp.email !== initialApp.email ||
        storedApp.phone !== initialApp.phone
      ) {
        storedList[idx] = {
          ...storedApp,
          applicationNo: initialApp.applicationNo,
          name: initialApp.name,
          email: initialApp.email,
          phone: initialApp.phone,
        };
        changed = true;
      }
    } else {
      storedList.push(initialApp);
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(storedList));
  }
  return storedList;
}

export function setStoredApplications(list: Application[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(list));
}

export function getStoredApplicationDetail(
  applicationNo: string,
): ApplicationDetail | null {
  if (typeof window === "undefined") {
    const data = getApplicationData(applicationNo);
    return data ? (data as ApplicationDetail) : null;
  }
  const key = `${APPLICATION_DETAILS_KEY_PREFIX}${applicationNo}`;
  const stored = localStorage.getItem(key);
  if (!stored) {
    const data = getApplicationData(applicationNo);
    if (!data) return null;
    localStorage.setItem(key, JSON.stringify(data));
    return data as ApplicationDetail;
  }
  const storedDetail = JSON.parse(stored) as ApplicationDetail;
  const initialData = getApplicationData(applicationNo);
  if (initialData) {
    if (
      storedDetail.applicant.name !== initialData.applicant.name ||
      storedDetail.applicant.email !== initialData.applicant.email ||
      storedDetail.applicant.primaryMobile !==
        initialData.applicant.primaryMobile
    ) {
      storedDetail.applicant.name = initialData.applicant.name;
      storedDetail.applicant.email = initialData.applicant.email;
      storedDetail.applicant.primaryMobile =
        initialData.applicant.primaryMobile;
      localStorage.setItem(key, JSON.stringify(storedDetail));
    }
  }
  return storedDetail;
}

export function setStoredApplicationDetail(applicationNo: string, data: any) {
  if (typeof window === "undefined") return;
  const key = `${APPLICATION_DETAILS_KEY_PREFIX}${applicationNo}`;
  localStorage.setItem(key, JSON.stringify(data));
}

// 1. Fetch all applications
export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      // Simulate small latency
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { data: getStoredApplications() };
    },
  });
}

// 2. Fetch single application details
export function useApplication(applicationNo: string) {
  return useQuery({
    queryKey: ["application", applicationNo],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return getStoredApplicationDetail(applicationNo);
    },
    enabled: !!applicationNo,
  });
}

// 3. Update application details
export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationNo,
      data,
    }: {
      applicationNo: string;
      data: any;
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Update full details
      setStoredApplicationDetail(applicationNo, data);

      // Also sync back details to the applications list summary
      const list = getStoredApplications();
      const idx = list.findIndex((a) => a.applicationNo === applicationNo);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          name: data.applicant.name,
          email: data.applicant.email,
          phone: data.applicant.primaryMobile,
          program: data.appliedFor
            ? data.appliedFor.replace(" 2026-27", "").replace(" 2026-2027", "")
            : list[idx].program,
          campus: data.preferences
            ? data.preferences.preference1
            : list[idx].campus,
        };
        setStoredApplications(list);
      }
      return data;
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

// 4. Update application summary
export function useUpdateApplicationSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedApp: Application) => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Update applications list
      const list = getStoredApplications();
      const idx = list.findIndex((a) => a.id === updatedApp.id);
      if (idx !== -1) {
        list[idx] = updatedApp;
        setStoredApplications(list);
      }

      // Sync back to full detail if it exists in storage
      const detail = getStoredApplicationDetail(updatedApp.applicationNo);
      if (detail) {
        detail.applicant.name = updatedApp.name;
        detail.applicant.email = updatedApp.email;
        detail.applicant.primaryMobile = updatedApp.phone;
        detail.appliedFor = updatedApp.program + " 2026-27";
        detail.preferences.preference1 = updatedApp.campus;
        detail.status =
          updatedApp.formStatus === "Submitted"
            ? "Review Pending"
            : updatedApp.formStatus;
        setStoredApplicationDetail(updatedApp.applicationNo, detail);
      }

      return updatedApp;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: ["application", variables.applicationNo],
      });
      toast.success("Application updated successfully");
    },
    onError: () => {
      toast.error("Failed to update application");
    },
  });
}

// 5. Delete an application
export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const list = getStoredApplications();
      const filtered = list.filter((app) => app.id !== id);
      setStoredApplications(filtered);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete application");
    },
  });
}
