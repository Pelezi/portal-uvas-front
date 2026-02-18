'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Member, AuthResponse, Matrix, MatrixAuthResponse } from '@/types';
import { authService } from '@/services/authService';

interface AuthContextType {
  user: Member | null;
  currentMatrix: { id: number; name: string } | null;
  matrices: Matrix[];
  isAuthenticated: boolean;
  isLoading: boolean;
  requireMatrixSelection: boolean;
  login: (email: string, password: string) => Promise<Member | MatrixAuthResponse>;
  selectMatrix: (matrixId: number) => Promise<{ member: Member; permission: any }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Member | null>(null);
  const [currentMatrix, setCurrentMatrix] = useState<{ id: number; name: string } | null>(null);
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [requireMatrixSelection, setRequireMatrixSelection] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    const updatedUser = await authService.refreshCurrentUser();
    if (updatedUser) {
      setUser(updatedUser);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      // Check if user is already logged in from localStorage
      // This is intentionally done in useEffect to initialize state on mount
      const initUser = authService.getCurrentUser();
      const initMatrix = authService.getCurrentMatrix();
      const initMatrices = authService.getMatrices();
      
      if (initUser) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(initUser);
        setCurrentMatrix(initMatrix);
        setMatrices(initMatrices);
        // Refresh user data on page load to get latest permissions
        await refreshUser();
      } else {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    
    // Check if requires matrix selection
    if ('requireMatrixSelection' in response && response.requireMatrixSelection) {
      setMatrices(response.matrices || []);
      setRequireMatrixSelection(true);
      return response as MatrixAuthResponse;
    }

    // From here, response is an AuthResponse with matrix info
    const auth = response as MatrixAuthResponse;
    // Backend now returns 'member' field instead of 'user'
    const memberData = auth.member || auth.user;
    const mergedUser: Member = {
      ...memberData,
      permission: auth.permission ?? memberData.permission ?? null,
    };
    
    setUser(mergedUser);
    setCurrentMatrix(auth.currentMatrix || null);
    setMatrices(auth.matrices || []);
    setRequireMatrixSelection(false);
    
    authService.setCurrentUser(mergedUser);
    authService.setCurrentMatrix(auth.currentMatrix || null);
    authService.setMatrices(auth.matrices || []);
    
    return mergedUser;
  };

  const selectMatrix = async (matrixId: number) => {
    const token = authService.getMatrixSelectionToken();
    if (!token) {
      throw new Error('No matrix selection token found');
    }
    
    const response = await authService.selectMatrix(token, matrixId);
    
    const mergedUser: Member = {
      ...response.member,
      permission: response.permission ?? response.member.permission ?? null,
    };
    
    setUser(mergedUser);
    setCurrentMatrix(response.currentMatrix);
    setMatrices(response.matrices);
    setRequireMatrixSelection(false);
    
    authService.setCurrentUser(mergedUser);
    authService.setCurrentMatrix(response.currentMatrix);
    authService.setMatrices(response.matrices);
    
    return {
      member: mergedUser,
      permission: response.permission ?? response.member.permission ?? null,
    };
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setCurrentMatrix(null);
    setMatrices([]);
    setRequireMatrixSelection(false);
  };

  // Poll for permission updates every 1 hour
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUser();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [user, refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        currentMatrix,
        matrices,
        isAuthenticated: !!user,
        isLoading,
        requireMatrixSelection,
        login,
        selectMatrix,
        logout,
        refreshUser,
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
