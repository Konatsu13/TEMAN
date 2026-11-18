import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  fetchUserSessionProfile,
  signInWithUsername,
  signOutCurrentUser,
} from '../services/authService';
import type { AppRole, Tables } from '../types/database.types';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Tables<'profiles'> | null;
  role: AppRole | null;
  isLoading: boolean;
  isConfigured: boolean;
  authError: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearAuthError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadProfileForUser = useCallback(async (activeUser: User | null) => {
    if (!activeUser) {
      setProfile(null);
      setRole(null);
      return;
    }

    try {
      const result = await fetchUserSessionProfile(activeUser.id);
      setProfile(result.profile);
      setRole(result.role);
      setAuthError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal memuat profil pengguna.';
      setProfile(null);
      setRole(null);
      setAuthError(message);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const client = supabase;
    let mounted = true;

    const initSession = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (!mounted) return;
        if (error) {
          setAuthError(error.message);
        }
        const activeSession = data.session ?? null;
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
        if (activeSession?.user) {
          await loadProfileForUser(activeSession.user);
        }
      } catch (err) {
        if (mounted) {
          setAuthError(
            err instanceof Error ? err.message : 'Gagal memeriksa sesi autentikasi.'
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    const { data: subscriptionData } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession?.user) {
          void loadProfileForUser(nextSession.user);
        } else {
          setProfile(null);
          setRole(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscriptionData.subscription.unsubscribe();
    };
  }, [loadProfileForUser]);

  const signIn = useCallback(async (username: string, password: string) => {
    setAuthError(null);
    const result = await signInWithUsername(username, password);
    setSession(result.session);
    setUser(result.user);
    setProfile(result.userProfile.profile);
    setRole(result.userProfile.role);
  }, []);

  const signOut = useCallback(async () => {
    await signOutCurrentUser();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    setAuthError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfileForUser(user);
    }
  }, [user, loadProfileForUser]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      role,
      isLoading,
      isConfigured: isSupabaseConfigured,
      authError,
      signIn,
      signOut,
      refreshProfile,
      clearAuthError,
    }),
    [
      session,
      user,
      profile,
      role,
      isLoading,
      authError,
      signIn,
      signOut,
      refreshProfile,
      clearAuthError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
