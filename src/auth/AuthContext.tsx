import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  AuthUser,
  Permission,
} from '../types';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  authError: string | null;

  login: () => void;

  logout:
    () => Promise<void>;

  refreshProfile:
    () => Promise<void>;

  hasPermission:
    (
      permission:
        Permission
    ) => boolean;
}

interface AuthProfileResponse {
  id: string;
  email: string;
  fullName: string;
  organizationId?: string;

  role:
    AuthUser['role'];

  roleSlug:
    | 'system_admin'
    | 'viewer';

  permissions:
    Permission[];
}

const AuthContext =
  createContext<
    AuthContextType |
    undefined
  >(undefined);

export const AuthProvider:
  React.FC<{
    children:
      React.ReactNode;
  }> = ({
    children,
  }) => {
  const [
    user,
    setUser,
  ] =
    useState<
      AuthUser | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    authError,
    setAuthError,
  ] =
    useState<
      string | null
    >(null);

  const fetchCurrentUser =
    async () => {
      setIsLoading(true);
      setAuthError(null);

      try {
        const response =
          await fetch(
            '/api/auth/me',
            {
              credentials:
                'include',
            }
          );

        if (
          response.status ===
          401
        ) {
          setUser(null);
          return;
        }

        const body =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          throw new Error(
            body?.error
              ?.message ||
            `Authentication failed (${response.status}).`
          );
        }

        const profile =
          body as
            AuthProfileResponse;

        setUser({
          user_id:
            profile.id,

          auth_uid:
            profile.id,

          full_name:
            profile.fullName,

          email:
            profile.email,

          role:
            profile.role ||
            'Read Only Viewer',

          permissions:
            Array.isArray(
              profile.permissions
            )
              ? profile
                  .permissions
              : [],

          organization:
            profile
              .organizationId ||
            'WorkOS',

          account_status:
            'Active',
        });
      } catch (error: any) {
        const message =
          error?.message ||
          'The authentication server could not be reached.';

        console.error(
          '[AuthContext] Failed to load user:',
          error
        );

        setAuthError(
          message
        );

        setUser(null);
      } finally {
        setIsLoading(
          false
        );
      }
    };

  useEffect(() => {
    void fetchCurrentUser();
  }, []);

  const login = () => {
    window.location.assign(
      '/login'
    );
  };

  const logout =
    async () => {
      try {
        setIsLoading(true);

        const csrfResponse =
          await fetch(
            '/api/auth/csrf-token',
            {
              credentials:
                'include',
            }
          );

        if (
          !csrfResponse.ok
        ) {
          throw new Error(
            'Could not create a logout security token.'
          );
        }

        const {
          csrfToken,
        } =
          await csrfResponse
            .json();

        const logoutResponse =
          await fetch(
            '/logout',
            {
              method:
                'POST',

              credentials:
                'include',

              headers: {
                'Content-Type':
                  'application/json',

                'x-csrf-token':
                  csrfToken,
              },
            }
          );

        const body =
          await logoutResponse
            .json()
            .catch(
              () => ({})
            );

        setUser(null);

        window.location.assign(
          body.logoutUrl ||
          '/login'
        );
      } catch (error) {
        console.error(
          '[AuthContext] Logout failed:',
          error
        );

        setUser(null);

        window.location.assign(
          '/login'
        );
      }
    };

  const refreshProfile =
    async () => {
      await fetchCurrentUser();
    };

  const hasPermission = (
    permission:
      Permission
  ): boolean => {
    return (
      user?.permissions
        ?.includes(
          permission
        ) ??
      false
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,

        isAuthenticated:
          Boolean(user),

        isLoading,

        loading:
          isLoading,

        authError,

        login,

        logout,

        refreshProfile,

        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth():
  AuthContextType {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.'
    );
  }

  return context;
}