import api from '@/lib/apiClient';
import { Subcategory } from '@/types';

export const subcategoryService = {
  getAll: async (groupId?: number): Promise<Subcategory[]> => {
    const url = groupId ? `/subcategories?groupId=${groupId}` : '/subcategories';
    const response = await api.get<Subcategory[]>(url);
    return response.data;
  },

  getByCategoryId: async (categoryId: number): Promise<Subcategory[]> => {
    const response = await api.get<Subcategory[]>(`/subcategories?categoryId=${categoryId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Subcategory> => {
    const response = await api.get<Subcategory>(`/subcategories/${id}`);
    return response.data;
  },

  create: async (data: Omit<Subcategory, 'id'>): Promise<Subcategory> => {
    const response = await api.post<Subcategory>('/subcategories', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Subcategory>): Promise<Subcategory> => {
    const response = await api.put<Subcategory>(`/subcategories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/subcategories/${id}`);
  },
};
