'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, UseAuthReturn } from '../hooks/useAuth';

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): UseAuthReturn => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Convenience hooks for specific auth states
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated;
};

export const useIsGuest = (): boolean => {
  const { isGuest } = useAuthContext();
  return isGuest;
};

export const useCurrentUser = () => {
  const { user } = useAuthContext();
  return user;
};

export const useUserType = () => {
  const { userType } = useAuthContext();
  return userType;
};

export const useCanAccess = () => {
  const { canAccess } = useAuthContext();
  return canAccess;
};

export const useRequireAuth = () => {
  const { requireAuth } = useAuthContext();
  return requireAuth;
};

export default AuthContext;