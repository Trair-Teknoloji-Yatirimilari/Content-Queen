import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Uygulamayı başlattığında kullanıcı oturumunu kontrol et
  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("@content_queen_user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to restore session:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, name: string) => {
    try {
      // Gerçek uygulamada backend'e gönderilecek
      const newUser: User = {
        id: Math.random().toString(36).substring(7),
        email,
        name,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem("@content_queen_user", JSON.stringify(newUser));
      setUser(newUser);
    } catch (e) {
      console.error("Sign in failed:", e);
      throw e;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem("@content_queen_user");
      setUser(null);
    } catch (e) {
      console.error("Sign out failed:", e);
      throw e;
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error("No user signed in");

    try {
      const updatedUser = { ...user, ...updates };
      await AsyncStorage.setItem("@content_queen_user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (e) {
      console.error("Profile update failed:", e);
      throw e;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isSignedIn: user !== null,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
