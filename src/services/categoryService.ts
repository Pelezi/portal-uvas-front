import api from '@/lib/apiClient';
import { Category } from '@/types';

export const categoryService = {
  getAll: async (groupId?: number): Promise<Category[]> => {
    const url = groupId ? `/categories?groupId=${groupId}` : '/categories';
    const response = await api.get<Category[]>(url);
    return response.data;
  },

  getById: async (id: number): Promise<Category> => {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  create: async (data: Omit<Category, 'id'>): Promise<Category> => {
    const response = await api.post<Category>('/categories', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Category>): Promise<Category> => {
    const response = await api.put<Category>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};
