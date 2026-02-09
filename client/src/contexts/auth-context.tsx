import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_ENDPOINTS } from "@/lib/apiConfig";
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
    // Check for existing session
    const userId = localStorage.getItem("userId");
    if (userId) {
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
      localStorage.removeItem("userId");
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const userData = await apiRequestJson<User>(
        'GET',
        API_ENDPOINTS.users.byUsername(username)
      );

      // Simple password check (in production, this should be handled server-side)
      if (userData.password !== password) {
        throw new Error("Invalid password");
      }

      const { password: _, ...safeUser } = userData;
      setUser(safeUser);
      setIsAuthenticated(true);
      localStorage.setItem("userId", safeUser.id);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("userId");
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
