import React from 'react';

import {
  useAuth,
} from './AuthContext';

import {
  Permission,
} from '../types';

interface PermissionGuardProps {
  permission:
    Permission;

  fallback?:
    React.ReactNode;

  children:
    React.ReactNode;
}

export const PermissionGuard:
  React.FC<
    PermissionGuardProps
  > = ({
    permission,
    fallback = null,
    children,
  }) => {
  const {
    hasPermission,
  } =
    useAuth();

  if (
    !hasPermission(
      permission
    )
  ) {
    return (
      <>
        {fallback}
      </>
    );
  }

  return (
    <>
      {children}
    </>
  );
};

export default PermissionGuard;