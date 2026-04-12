import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { loginPurchases } from "./purchases";

const SESSION_KEY = "cq_session_token";
const USER_KEY = "cq_user";

export interface User {
  id: number;
  phone: string;
  name: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  sessionToken: string | null;
  setSession: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getStored(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setStored(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function removeStored(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restore();
  }, []);

  const restore = async () => {
    try {
      const [token, stored] = await Promise.all([
        getStored(SESSION_KEY),
        getStored(USER_KEY),
      ]);
      if (token && stored) {
        setSessionToken(token);
        const parsed = JSON.parse(stored);
        setUser(parsed);
        loginPurchases(String(parsed.id)).catch(() => {});
      }
    } catch (e) {
      console.error("[Auth] Restore failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const setSession = async (token: string, userData: User) => {
    await setStored(SESSION_KEY, token);
    await setStored(USER_KEY, JSON.stringify(userData));
    setSessionToken(token);
    setUser(userData);
    // RevenueCat'e kullanıcı ID'sini bildir
    loginPurchases(String(userData.id)).catch(() => {});
  };

  const signOut = async () => {
    await removeStored(SESSION_KEY);
    await removeStored(USER_KEY);
    setSessionToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    setStored(USER_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSignedIn: user !== null,
        sessionToken,
        setSession,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
