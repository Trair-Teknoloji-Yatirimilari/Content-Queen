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
        // Token'ı backend'den doğrula
        try {
          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_BASE_URL || ""}/api/auth/me`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setSessionToken(token);
              const parsed = JSON.parse(stored);
              // Backend'den gelen güncel bilgiyle güncelle
              const updatedUser = { ...parsed, ...data.user };
              setUser(updatedUser);
              loginPurchases(String(updatedUser.id)).catch(() => {});
              return;
            }
          }
        } catch {
          // Ağ hatası — offline olabilir, mevcut session'ı kullan
          const parsed = JSON.parse(stored);
          setSessionToken(token);
          setUser(parsed);
          loginPurchases(String(parsed.id)).catch(() => {});
          return;
        }
        // Token geçersiz — temizle
        await removeStored(SESSION_KEY);
        await removeStored(USER_KEY);
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
