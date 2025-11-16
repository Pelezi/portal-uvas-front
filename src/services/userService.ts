import apiClient from '@/lib/apiClient';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  firstAccess: boolean;
  locale: string;
  timezone?: string;
  createdAt: string;
}

export const userService = {
  async register(data: { email: string; firstName: string; lastName: string; password: string }): Promise<User> {
    const response = await apiClient.post('/users/register', data);
    return response.data;
  },

  async updateLocale(locale: string): Promise<User> {
    const response = await apiClient.patch('/users/locale', { locale });
    return response.data;
  },

  async updateProfile(data: { timezone?: string; locale?: string; phoneNumber?: string }): Promise<User> {
    const response = await apiClient.patch('/users/profile', data);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/users/me');
    return response.data;
  }
};
