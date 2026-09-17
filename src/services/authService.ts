import type { UserRole } from '@/types/database';
import { getSupabaseClient, isSupabaseConfigured, isProductionEnvironment } from './supabaseClient';

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  expiresAt?: number;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Extracts and validates the authoritative role from Supabase user app_metadata.
 * Client-controlled user_metadata is completely ignored.
 */
function extractRoleFromAppMetadata(rawRole?: unknown): UserRole {
  if (rawRole === 'admin') return 'admin';
  if (rawRole === 'staff') return 'staff';
  return 'public';
}

/**
 * Lightweight authentication service wrapping Supabase Auth.
 * Authoritatively verifies roles from server-managed app_metadata claims.
 * Provides deterministic local development fallback when Supabase is not configured.
 */
export class AuthService {
  private localMockSession: AuthSession | null = null;

  /**
   * Signs in using email and password.
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    const supabase = getSupabaseClient();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error || !data.user) {
        return {
          success: false,
          error: error?.message || 'Authentication failed.'
        };
      }

      // Authoritatively resolve role from server-managed app_metadata
      const role = extractRoleFromAppMetadata(data.user.app_metadata?.role);

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role
        }
      };
    }

    // Production environment guard: unconfigured Supabase authentication must fail safely
    if (isProductionEnvironment()) {
      return {
        success: false,
        error: 'Production deployment requires active Supabase authentication configuration. Local mock authentication is strictly disabled in production.'
      };
    }

    // Local deterministic development fallback
    const emailLower = credentials.email.toLowerCase().trim();
    if (emailLower.includes('admin')) {
      this.localMockSession = {
        user: { id: 'mock-admin-01', email: credentials.email, role: 'admin' },
        accessToken: 'mock-admin-token',
        expiresAt: Date.now() + 3600 * 1000
      };
      return { success: true, user: this.localMockSession.user };
    }

    if (emailLower.includes('staff')) {
      this.localMockSession = {
        user: { id: 'mock-staff-01', email: credentials.email, role: 'staff' },
        accessToken: 'mock-staff-token',
        expiresAt: Date.now() + 3600 * 1000
      };
      return { success: true, user: this.localMockSession.user };
    }

    // Default mock user has public role
    this.localMockSession = {
      user: { id: 'mock-public-01', email: credentials.email, role: 'public' },
      accessToken: 'mock-public-token',
      expiresAt: Date.now() + 3600 * 1000
    };
    return { success: true, user: this.localMockSession.user };
  }

  /**
   * Signs out the current user.
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    }

    this.localMockSession = null;
    return { success: true };
  }

  /**
   * Retrieves the current authenticated session.
   */
  async getSession(): Promise<AuthSession | null> {
    const supabase = getSupabaseClient();

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return null;

      const role = extractRoleFromAppMetadata(data.session.user.app_metadata?.role);
      return {
        user: {
          id: data.session.user.id,
          email: data.session.user.email,
          role
        },
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at
      };
    }

    if (isProductionEnvironment()) {
      return null;
    }

    return this.localMockSession;
  }

  /**
   * Retrieves the current user details, or null if unauthenticated.
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await this.getSession();
    return session?.user || null;
  }

  /**
   * Authoritatively retrieves the role for the active session.
   * Unauthenticated clients return 'public'.
   */
  async getUserRole(): Promise<UserRole> {
    const user = await this.getCurrentUser();
    return user?.role || 'public';
  }

  /**
   * Subscribes to authentication state changes.
   */
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void): { unsubscribe: () => void } {
    const supabase = getSupabaseClient();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!session?.user) {
          callback(event, null);
          return;
        }

        const role = extractRoleFromAppMetadata(session.user.app_metadata?.role);
        callback(event, {
          user: {
            id: session.user.id,
            email: session.user.email,
            role
          },
          accessToken: session.access_token,
          expiresAt: session.expires_at
        });
      });

      return {
        unsubscribe: () => subscription.unsubscribe()
      };
    }

    // Local fallback: no-op subscription
    return {
      unsubscribe: () => {}
    };
  }

  /**
   * Clears the local mock session (used in testing).
   */
  clearMockSession(): void {
    this.localMockSession = null;
  }
}

export const authService = new AuthService();
