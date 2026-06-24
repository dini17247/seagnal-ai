import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRole, Permission } from '../types';

export const CLIENT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'System Administrator': [
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view', 'alerts.audit', 'alerts.resolve',
    'reports.view', 'reports.create', 'reports.edit', 'reports.finalize', 'reports.export',
    'settings.view', 'settings.update', 'users.view', 'users.manage', 'audit_logs.view',
  ],
  'Watch Commander': [
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view', 'alerts.audit', 'alerts.resolve',
    'reports.view', 'reports.finalize', 'reports.export', 'settings.view',
  ],
  'Intelligence Analyst': [
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view',
    'reports.view', 'reports.create', 'reports.edit', 'reports.export',
  ],
  'Alert Officer': [
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view', 'alerts.audit', 'alerts.resolve',
  ],
  'Read Only Viewer': [
    'dashboard.view', 'map.view', 'vessels.view',
  ],
};

// Only available when USE_MOCK_DATA=true / dev mode — kept for reference in LoginView
export const MOCK_USERS: AuthUser[] = [
  {
    user_id: 'usr-001',
    auth_uid: 'auth_admin',
    full_name: 'Dini Sage (Administrator)',
    email: 'dini@citysage.my',
    role: 'System Administrator',
    organization: 'Maritime HQ Command',
    account_status: 'Active',
  },
  {
    user_id: 'usr-002',
    auth_uid: 'auth_commander',
    full_name: 'Capt. Sarah Connor (Commander)',
    email: 'sarah.connor@seagnal.ai',
    role: 'Watch Commander',
    organization: 'Pacific Patrol Force',
    account_status: 'Active',
  },
  {
    user_id: 'usr-003',
    auth_uid: 'auth_analyst',
    full_name: 'Eliot Vance (Analyst)',
    email: 'eliot.vance@seagnal.ai',
    role: 'Intelligence Analyst',
    organization: 'Seagnal Intel Agency',
    account_status: 'Active',
  },
  {
    user_id: 'usr-004',
    auth_uid: 'auth_officer',
    full_name: 'Officer David Kim',
    email: 'david.kim@seagnal.ai',
    role: 'Alert Officer',
    organization: 'Port of Singapore',
    account_status: 'Active',
  },
  {
    user_id: 'usr-005',
    auth_uid: 'auth_viewer',
    full_name: 'External Observer (Viewer)',
    email: 'external@seagnal.ai',
    role: 'Read Only Viewer',
    organization: 'UN Maritime Assoc',
    account_status: 'Active',
  },
];

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  authError: string | null;
  isMockAuth: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  selectMockUser: (uid: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  // Default false — will be set true only if the server confirms mock session
  const [isMockAuth, setIsMockAuth] = useState<boolean>(false);

  const fetchCurrentUser = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // credentials: 'include' is required to send the session cookie cross-port
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const mappedUser: AuthUser = {
          user_id: data.id,
          auth_uid: data.id,
          full_name: data.fullName,
          email: data.email,
          role: data.role || 'Read Only Viewer',
          organization: data.organizationId || 'WorkOS Organization',
          account_status: 'Active',
        };
        setUser(mappedUser);
        // Mark as mock only if the server returned the known mock user ID
        setIsMockAuth(data.id === 'usr-mock-001');
      } else if (response.status === 401) {
        // Not authenticated — show login screen
        setUser(null);
      } else {
        // Unexpected server error
        const body = await response.json().catch(() => ({}));
        const msg = body?.error?.message || `Server error (${response.status})`;
        console.error('[AuthContext] /api/auth/me error:', msg);
        setAuthError(msg);
        setUser(null);
      }
    } catch (err: any) {
      const msg = err?.message || 'Network error reaching authentication server.';
      console.error('[AuthContext] Network error fetching user:', msg);
      setAuthError(msg);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = () => {
    // Navigates to /login which is proxied to Express → WorkOS redirect
    window.location.href = '/login';
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // Step 1: Obtain a CSRF token (sent as double-submit cookie)
      const csrfResponse = await fetch('/api/auth/csrf-token', {
        credentials: 'include',
      });
      if (!csrfResponse.ok) {
        throw new Error('Failed to fetch CSRF token for logout.');
      }
      const { csrfToken } = await csrfResponse.json();

      // Step 2: POST /logout with the CSRF token in the x-csrf-token header
      // (csrf-csrf reads from header, not form body)
      const logoutResponse = await fetch('/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });

      // The server will redirect to WorkOS logout URL; follow the redirect
      if (logoutResponse.redirected) {
        window.location.href = logoutResponse.url;
      } else {
        window.location.href = '/login';
      }
    } catch (err: any) {
      console.error('[AuthContext] Logout error:', err);
      // Clear client state and redirect even on error
      setUser(null);
      window.location.href = '/login';
    }
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const permissions = CLIENT_ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  };

  // Only available in mock/dev mode
  const selectMockUser = (uid: string) => {
    const candidateUser = MOCK_USERS.find(u => u.auth_uid === uid);
    if (candidateUser) {
      setUser(candidateUser);
      setIsMockAuth(true);
      localStorage.setItem('seagnal_mock_uid', uid);
      console.log(`🔄 Client role-swapped to mock profile: [${candidateUser.full_name}]`);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        loading: isLoading,
        authError,
        isMockAuth,
        login,
        logout,
        refreshProfile,
        hasPermission,
        selectMockUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be consumed inside an AuthProvider scope.');
  }
  return context;
};
