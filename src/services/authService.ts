import api, { apiClient } from '@/lib/apiClient';
import { AuthResponse, Member, LoginResponse, SetPasswordResponse } from '@/types';

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    const data = response.data;

    // If backend returned a setPasswordUrl, return it immediately (no token present)
    if ('setPasswordUrl' in data) {
      return data as SetPasswordResponse;
    }

    // From here we expect an AuthResponse shape
    const auth = data as AuthResponse;
    if (auth.token) {
      apiClient.setToken(auth.token);
      if (typeof window !== 'undefined') {
        // Merge top-level permission into the persisted user when present
        const userToPersist = auth.permission
          ? { ...auth.user, permission: auth.permission }
          : auth.user;
        localStorage.setItem('user', JSON.stringify(userToPersist));
      }
    }

    return auth;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
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

  refreshCurrentUser: async (): Promise<Member | null> => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return null;

    try {
      const response = await api.get<Member>(`/members/${currentUser.permission.id}`);
      const updatedUser = response.data;
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

  requestSetPassword: async (email: string): Promise<void> => {
    await api.post('/members/request-set-password', { email });
  },
};
