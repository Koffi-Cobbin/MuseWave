import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/apiConfig";
import { apiRequestJson } from "@/lib/queryClient";
import type { User } from "../../../shared/schema";

interface AuthContextType {
  user: Omit<User, "password"> | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<User, "password"> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session with token
    const accessToken = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");

    if (accessToken && userId) {
      loadUser(userId);
    }
  }, []);

  const loadUser = async (userId: string) => {
    try {
      const userData = await apiRequestJson<User>('GET', API_ENDPOINTS.users.byId(userId));
      const { password: _, ...safeUser } = userData;
      setUser(safeUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Failed to load user:", error);
      // Clear tokens on failure
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      // Backend expects username_or_email field
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.users.login}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username_or_email: username,  // Changed from 'username' to 'username_or_email'
          password: password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Backend returns: { token: { access, refresh }, user: {...}, message }
      const { token, user: userData } = data;

      // Store tokens
      if (token?.access) {
        localStorage.setItem("accessToken", token.access);
      }
      if (token?.refresh) {
        localStorage.setItem("refreshToken", token.refresh);
      }

      // Store user data
      if (userData?.id) {
        localStorage.setItem("userId", userData.id);
        setUser(userData);
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

      // Call logout endpoint to blacklist token
      if (refreshToken) {
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.users.logout}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("accessToken")}`,
          },
          credentials: 'include',
          body: JSON.stringify({ refresh: refreshToken })
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local state regardless of API call success
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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