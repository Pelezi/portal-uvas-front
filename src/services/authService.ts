import api, { apiClient } from '@/lib/apiClient';
import { AuthResponse, Member, LoginResponse, SetPasswordResponse, MatrixAuthResponse, Matrix } from '@/types';

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse | MatrixAuthResponse> => {
    const response = await api.post<LoginResponse | MatrixAuthResponse>('/auth/login', { 
      email, 
      password
    });
    const data = response.data;

    // If backend returned a setPasswordUrl, return it immediately (no token present)
    if ('setPasswordUrl' in data) {
      return data as SetPasswordResponse;
    }

    // Check if requires matrix selection
    if ('requireMatrixSelection' in data && data.requireMatrixSelection) {
      // Store temporary token for matrix selection
      if (data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('matrixSelectionToken', data.token);
        }
      }
      return data as MatrixAuthResponse;
    }

    // From here we expect an AuthResponse shape with matrix info
    const auth = data as MatrixAuthResponse;
    if (auth.token) {
      apiClient.setToken(auth.token);
      // Store refresh token if provided
      if ('refreshToken' in auth && auth.refreshToken) {
        apiClient.setRefreshToken(auth.refreshToken);
      }
      if (typeof window !== 'undefined') {
        // Merge top-level permission into the persisted user when present
        const userToPersist = auth.permission
          ? { ...auth.user, permission: auth.permission }
          : auth.user;
        localStorage.setItem('user', JSON.stringify(userToPersist));
        
        // Store matrix info
        if (auth.currentMatrix) {
          localStorage.setItem('currentMatrix', JSON.stringify(auth.currentMatrix));
        }
        if (auth.matrices) {
          localStorage.setItem('matrices', JSON.stringify(auth.matrices));
        }
      }
    }

    return auth;
  },

  selectMatrix: async (token: string, matrixId: number) => {
    const response = await api.post('/auth/select-matrix', { token, matrixId });
    const data = response.data;

    if (data.token) {
      apiClient.setToken(data.token);
      if (data.refreshToken) {
        apiClient.setRefreshToken(data.refreshToken);
      }
      if (typeof window !== 'undefined') {
        const userToPersist = data.permission
          ? { ...data.member, permission: data.permission }
          : data.member;
        localStorage.setItem('user', JSON.stringify(userToPersist));
        localStorage.setItem('currentMatrix', JSON.stringify(data.currentMatrix));
        localStorage.setItem('matrices', JSON.stringify(data.matrices));
        localStorage.removeItem('matrixSelectionToken');
      }
    }

    return data;
  },

  logout: async () => {
    if (typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refreshToken');
      // Call logout endpoint to revoke refresh token
      if (refreshToken) {
        try {
          await api.post('/auth/logout', { refreshToken });
        } catch (error) {
          console.error('Error during logout:', error);
        }
      }
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('currentMatrix');
      localStorage.removeItem('matrices');
      localStorage.removeItem('matrixSelectionToken');
    }
  },

  getCurrentUser: () => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },

  setCurrentUser: (user: Member | null) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  getCurrentMatrix: (): { id: number; name: string } | null => {
    if (typeof window !== 'undefined') {
      const matrixStr = localStorage.getItem('currentMatrix');
      return matrixStr ? JSON.parse(matrixStr) : null;
    }
    return null;
  },

  setCurrentMatrix: (matrix: { id: number; name: string } | null) => {
    if (typeof window !== 'undefined') {
      if (matrix) {
        localStorage.setItem('currentMatrix', JSON.stringify(matrix));
      } else {
        localStorage.removeItem('currentMatrix');
      }
    }
  },

  getMatrices: (): Matrix[] => {
    if (typeof window !== 'undefined') {
      const matricesStr = localStorage.getItem('matrices');
      return matricesStr ? JSON.parse(matricesStr) : [];
    }
    return [];
  },

  setMatrices: (matrices: Matrix[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('matrices', JSON.stringify(matrices));
    }
  },

  getMatrixSelectionToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('matrixSelectionToken');
    }
    return null;
  },

  refreshCurrentUser: async (): Promise<Member | null> => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return null;

    try {
      // Use the new refresh endpoint that returns updated user data and permissions
      const response = await api.get<{ user: Member; permission: any }>('/auth/refresh');
      const { user: updatedMemberData, permission: updatedPermission } = response.data;
      
      // Merge the updated permission into the user data
      const updatedUser: Member = {
        ...updatedMemberData,
        permission: updatedPermission,
      };
      
      authService.setCurrentUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('authToken');
    }
    return false;
  },

  setPassword: async (token: string, password: string): Promise<void> => {
    await api.post('/members/set-password', { token, password });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, newPassword });
  },

};
