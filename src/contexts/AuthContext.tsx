import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { syncPendingActivitiesToSupabase } from '../utils/activityLogs';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  popupBlockedUrl: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_CHANNEL_NAME = 'scene_shadow_supabase_auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [popupBlockedUrl, setPopupBlockedUrl] = useState<string | null>(null);

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }, []);

  // Upsert & load user record in public.users
  const syncUserToDatabase = useCallback(
    async (authUser: User | null): Promise<UserProfile | null> => {
      if (!authUser) {
        setProfile(null);
        return null;
      }

      try {
        const supabase = getSupabase();
        const metadata = authUser.user_metadata || {};
        const appMetadata = authUser.app_metadata || {};

        const fullName: string | null =
          metadata.full_name || metadata.name || authUser.email?.split('@')[0] || null;
        const avatarUrl: string | null =
          metadata.avatar_url || metadata.picture || null;
        const provider: string = appMetadata.provider || 'google';

        const { data, error } = await supabase
          .from('users')
          .upsert(
            {
              id: authUser.id,
              email: authUser.email ?? null,
              full_name: fullName,
              avatar_url: avatarUrl,
              provider,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select()
          .single();

        if (error) {
          console.warn('Failed to sync user profile to public.users:', error.message);
          return null;
        }

        const synced = data as UserProfile;
        setProfile(synced);

        // Flush any buffered guest activity logs to Supabase
        await syncPendingActivitiesToSupabase(authUser.id);

        return synced;
      } catch (err) {
        console.warn('Unexpected error syncing user to public.users:', err);
        return null;
      }
    },
    [getSupabase]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await syncUserToDatabase(user);
  }, [user, syncUserToDatabase]);

  // Initialize session, handle OAuth callback (normal & popup), and listen to auth state changes
  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    let broadcastChannel: BroadcastChannel | null = null;

    const supabaseReady = isSupabaseConfigured();
    if (!supabaseReady) {
      setIsLoading(false);
      return;
    }

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = getSupabase();
    } catch (err) {
      console.warn('Supabase initialization skipped:', err);
      setIsLoading(false);
      return;
    }

    const notifyOpenerIfPopup = (activeSession: Session | null) => {
      if (
        typeof window !== 'undefined' &&
        activeSession &&
        window.opener &&
        window.opener !== window
      ) {
        const payload = {
          type: 'SUPABASE_AUTH_SESSION',
          access_token: activeSession.access_token,
          refresh_token: activeSession.refresh_token,
        };
        try {
          window.opener.postMessage(payload, window.location.origin);
        } catch {
          // ignore cross-origin issues
        }
        try {
          const ch = new BroadcastChannel(AUTH_CHANNEL_NAME);
          ch.postMessage(payload);
          ch.close();
        } catch {
          // ignore if BroadcastChannel unavailable
        }
        setTimeout(() => {
          try {
            window.close();
          } catch {
            // ignore
          }
        }, 150);
      }
    };

    const cleanOAuthUrlParams = () => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const hasAuthParams =
        url.searchParams.has('code') ||
        url.searchParams.has('error') ||
        url.hash.includes('access_token=');
      if (hasAuthParams) {
        window.history.replaceState({}, document.title, url.pathname);
      }
    };

    const initAuth = async () => {
      try {
        // Check if URL returned an OAuth error
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const oauthErr = params.get('error_description') || params.get('error');
          if (oauthErr) {
            setAuthError(oauthErr);
            cleanOAuthUrlParams();
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Error fetching Supabase session:', error.message);
        }

        const initialSession = data.session ?? null;
        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }

        if (initialSession?.user) {
          await syncUserToDatabase(initialSession.user);
          cleanOAuthUrlParams();
          notifyOpenerIfPopup(initialSession);
        }
      } catch (err) {
        console.warn('Auth initialization failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    // Listen to auth state changes globally
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setIsLoading(false);

        if (nextSession?.user) {
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
            await syncUserToDatabase(nextSession.user);
            cleanOAuthUrlParams();
            notifyOpenerIfPopup(nextSession);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );
    subscription = authListener.subscription;

    // Listen for session messages from OAuth popup (iframe compatibility)
    const applyPopupSession = async (accessToken: string, refreshToken: string) => {
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setPopupBlockedUrl(null);
          await syncUserToDatabase(data.session.user);
        }
      } catch (err) {
        console.warn('Failed to apply popup auth session:', err);
      }
    };

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (
        event.data?.type === 'SUPABASE_AUTH_SESSION' &&
        event.data?.access_token &&
        event.data?.refresh_token
      ) {
        applyPopupSession(event.data.access_token, event.data.refresh_token);
      }
    };

    window.addEventListener('message', handleWindowMessage);

    try {
      broadcastChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (
          event.data?.type === 'SUPABASE_AUTH_SESSION' &&
          event.data?.access_token &&
          event.data?.refresh_token
        ) {
          applyPopupSession(event.data.access_token, event.data.refresh_token);
        }
      };
    } catch {
      // ignore if unsupported
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('message', handleWindowMessage);
      try {
        broadcastChannel?.close();
      } catch {
        // ignore
      }
    };
  }, [getSupabase, syncUserToDatabase]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setPopupBlockedUrl(null);

    try {
      if (!isSupabaseConfigured()) {
        setAuthError(
          'Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 또는 VITE_*)가 배포 환경에 설정되지 않았습니다.'
        );
        return;
      }

      const supabase = getSupabase();
      const isInIframe =
        typeof window !== 'undefined' && window.self !== window.top;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: isInIframe,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (isInIframe && data?.url) {
        const width = 500;
        const height = 640;
        const left = Math.max(0, (window.screen.width - width) / 2);
        const top = Math.max(0, (window.screen.height - height) / 2);
        const popup = window.open(
          data.url,
          'google_oauth_login',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        if (!popup) {
          setPopupBlockedUrl(data.url);
          setAuthError('팝업이 차단되었습니다. 아래 링크를 눌러 Google 로그인을 진행해주세요.');
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Google 로그인 중 오류가 발생했습니다.');
    }
  }, [getSupabase]);

  const signOut = useCallback(async () => {
    setAuthError(null);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(error.message);
        return;
      }
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (err: any) {
      setAuthError(err?.message || '로그아웃 중 오류가 발생했습니다.');
    }
  }, [getSupabase]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setPopupBlockedUrl(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isAuthenticated: Boolean(user),
        authError,
        popupBlockedUrl,
        signInWithGoogle,
        signOut,
        clearAuthError,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
