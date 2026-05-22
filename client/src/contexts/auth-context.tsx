import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import { toCamelCaseObject } from "@/lib/caseTransform";
import type { User } from "../../../shared/schema";

/**
 * Flattens field-level error objects into a dot-separated string.
 * {"email": ["msg1"], "username": ["msg2"]} → "msg1. msg2"
 */
function flattenFieldErrors(obj: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const msg of value) {
        if (typeof msg === "string") parts.push(msg);
      }
    } else if (typeof value === "string") {
      parts.push(value);
    }
  }
  return parts.length > 0 ? parts.join(". ") : JSON.stringify(obj);
}

interface AuthContextType {
  user: Omit<User, "password"> | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<User, "password"> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasToken = !!(localStorage.getItem("accessToken") && localStorage.getItem("userId"));
  const [isLoading, setIsLoading] = useState(hasToken);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");
    if (accessToken && userId) {
      loadUser(userId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUser = async (userId: string) => {
    try {
      const userData = await apiRequestJson<User>('GET', API_ENDPOINTS.users.byId(userId));
      // The detail endpoint may not return email. Restore it from localStorage
      // (saved during login) so it's available immediately on page reload.
      const cachedEmail = localStorage.getItem("userEmail");
      const { password: _, ...safeUser } = userData;
      if (!safeUser.email && cachedEmail) {
        safeUser.email = cachedEmail;
      }
      setUser(safeUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Failed to load user:", error);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      // Backend login_view expects `username_or_email` field (confirmed in source)
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.users.login}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username_or_email: username, password }),
      });

      if (!response.ok) {
        // FIX: backend returns { error, status, attempts_remaining } on 401 —
        // extract the `error` field specifically (not just statusText)
        const errorData = await response.json().catch(() => ({}));
        const rawMsg: unknown =
          errorData.error ??
          errorData.detail ??
          (Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : null) ??
          `${response.status}: ${response.statusText}`;
        throw new Error(
          typeof rawMsg === "string"
            ? rawMsg
            : Array.isArray(rawMsg)
              ? rawMsg.join(". ")
              : typeof rawMsg === "object" && rawMsg !== null
                ? flattenFieldErrors(rawMsg as Record<string, unknown>)
                : `${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();

      // Backend may return tokens as either top-level values or nested under `token`.
      const accessToken =
        data.access ??
        data.token?.access ??
        data.token ??
        data.accessToken;
      const refreshToken =
        data.refresh ??
        data.token?.refresh ??
        data.refreshToken;
      const userData = data.user ?? data.userData ?? data;

      if (typeof accessToken === "string" && accessToken) {
        localStorage.setItem("accessToken", accessToken);
      }
      if (typeof refreshToken === "string" && refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      const normalizedUser = toCamelCaseObject<User>(userData);
      if (normalizedUser?.id) {
        localStorage.setItem("userId", normalizedUser.id);
        if (normalizedUser.email) localStorage.setItem("userEmail", normalizedUser.email);
        setUser(normalizedUser);
        setIsAuthenticated(true);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.users.logout}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("accessToken")}`,
          },
          credentials: 'include',
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}