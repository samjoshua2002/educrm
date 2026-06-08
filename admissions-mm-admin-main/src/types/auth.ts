export enum Role {
  SUPERADMIN = "superadmin",
  ORG_ADMIN = "org_admin",
  LEAD_MANAGER = "lead_manager",
  COUNSELOR = "counselor",
  APPLICATION_MANAGER = "application_manager",
  EXAM_MANAGER = "exam_manager",
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  isActive?: boolean;
  branchId?: string;
  organizationId: string | null;
}

export interface AuthState {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}
