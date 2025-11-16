import api, { apiClient } from '@/lib/apiClient';
import { AuthResponse } from '@/types';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/users/login', { email, password });
    if (response.data.token) {
      apiClient.setToken(response.data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }
    return response.data;
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

  setCurrentUser: (user: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('authToken');
    }
    return false;
  },

  completeSetup: async (categories: Array<{ name: string; type: 'EXPENSE' | 'INCOME'; subcategories: string[] }>) => {
    const response = await api.post('/users/setup', { categories });
    if (typeof window !== 'undefined' && response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },
};
