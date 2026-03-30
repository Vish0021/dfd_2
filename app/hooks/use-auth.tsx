import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { onAuthState, signOut } from "~/lib/firebase/auth";
import { getUser } from "~/lib/firebase/services/users.service";
import { initFcm, onForegroundMessage } from "~/lib/firebase/services/fcm.service";
import type { DFDUser } from "~/lib/firebase/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
  firebaseUser: User | null;
  profile: DFDUser | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    profile: null,
    loading: true,
  });
  const fcmInitialized = useRef(false);
  const stopFcmListener = useRef<(() => void) | null>(null);

  const fetchProfile = async (uid: string) => {
    try {
      const profile = await getUser(uid);
      setState((prev) => ({ ...prev, profile }));
      if (profile?.location) {
        // Dynamically import to prevent circular dependency
        const { useLocationStore } = await import("~/hooks/use-location");
        useLocationStore.getState().setLocation(profile.location);
      }
    } catch {
      setState((prev) => ({ ...prev, profile: null }));
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthState(async (user) => {
      if (user) {
        setState((prev) => ({ ...prev, firebaseUser: user, loading: true }));
        await fetchProfile(user.uid);
        setState((prev) => ({ ...prev, loading: false }));

        // Initialise FCM once per session
        if (!fcmInitialized.current) {
          fcmInitialized.current = true;
          initFcm(user.uid).catch(() => undefined);
          onForegroundMessage(({ title, body }) => {
            if (Notification.permission === "granted") {
              new Notification(title, { body, icon: "/favicon.svg" });
            }
          }).then((stop) => {
            stopFcmListener.current = stop;
          }).catch(() => undefined);
        }
      } else {
        fcmInitialized.current = false;
        stopFcmListener.current?.();
        stopFcmListener.current = null;
        setState({ firebaseUser: null, profile: null, loading: false });
      }
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut();
    // Dynamically require to avoid circular initialization
    const { useLocationStore } = await import("~/hooks/use-location");
    useLocationStore.getState().setLocation({
      label: "Home",
      address: "Manipal, Karnataka",
      lat: 13.3409,
      lng: 74.7421,
    });
    setState({ firebaseUser: null, profile: null, loading: false });
  };

  const refreshProfile = async () => {
    if (state.firebaseUser) {
      await fetchProfile(state.firebaseUser.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
