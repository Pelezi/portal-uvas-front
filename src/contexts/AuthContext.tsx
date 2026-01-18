'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Member, SetPasswordResponse, AuthResponse } from '@/types';
import { authService } from '@/services/authService';

interface AuthContextType {
  user: Member | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Member | SetPasswordResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in from localStorage
    // This is intentionally done in useEffect to initialize state on mount
    const initUser = authService.getCurrentUser();
    if (initUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(initUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    // If backend returned a setPasswordUrl (user has no password), bubble it up so the UI can redirect.
    if ('setPasswordUrl' in response) {
      return response as SetPasswordResponse;
    }

    // From here, response is an AuthResponse
    const auth = response as AuthResponse;
    const mergedUser: Member = {
      ...auth.user,
      permission: auth.permission ?? auth.user.permission ?? null,
    };
    setUser(mergedUser);
    authService.setCurrentUser(mergedUser);
    return mergedUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
