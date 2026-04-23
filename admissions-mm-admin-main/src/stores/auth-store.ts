import { create } from "zustand";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { User, Role } from "@/types/auth";
import { queryClient } from "@/lib/query-client";

interface AuthState {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const COOKIE_NAME = "auth_token";
const ROLE_COOKIE_NAME = "user_role";

const getInitialUser = (): User | null => {
  if (typeof window === "undefined") return null;
  
  const token = Cookies.get(COOKIE_NAME);
  const role = Cookies.get(ROLE_COOKIE_NAME);
  
  if (!token || !role) return null;

  try {
    const decoded: any = jwtDecode(token);
    // Role and orgId should be extracted from decoded token in a real scenario
    // For hydration, we trust the cookies initially but backend will verify
    return {
      id: decoded.sub,
      name: decoded.name || "User",
      email: decoded.email,
      role: role as Role,
      organizationId: decoded.organizationId || null,
    };
  } catch (error) {
    console.error("Token decoding failed:", error);
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  login: (token, user) => {
    // Set cookies
    Cookies.set(COOKIE_NAME, token, { expires: 1, sameSite: "lax" });
    Cookies.set(ROLE_COOKIE_NAME, user.role, { expires: 1, sameSite: "lax" });
    set({ user });
  },
  logout: () => {
    Cookies.remove(COOKIE_NAME);
    Cookies.remove(ROLE_COOKIE_NAME);
    set({ user: null });
    queryClient.clear();
    
    // Clear potentially sensitive data from localStorage if any
    if (typeof window !== "undefined") {
       // Optional: sessionStorage.clear();
    }
  },
}));
