import api from '@/lib/apiClient';
import { Budget, BudgetComparison } from '@/types';

export const budgetService = {
  getAll: async (params?: {
    year?: string;
    month?: number;
    type?: string;
    groupId?: number;
  }): Promise<Budget[]> => {
    const queryParams = new URLSearchParams();
    if (params?.year) queryParams.append('year', params.year);
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.groupId) queryParams.append('groupId', params.groupId.toString());
    
    const queryString = queryParams.toString();
    const url = queryString ? `/budgets?${queryString}` : '/budgets';
    const response = await api.get<Budget[]>(url);
    return response.data;
  },

  getById: async (id: number): Promise<Budget> => {
    const response = await api.get<Budget>(`/budgets/${id}`);
    return response.data;
  },

  create: async (data: Omit<Budget, 'id'>): Promise<Budget> => {
    const response = await api.post<Budget>('/budgets', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Budget>): Promise<Budget> => {
    const response = await api.put<Budget>(`/budgets/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/budgets/${id}`);
  },

  getComparison: async (params: {
    year: string;
    month?: number;
    subcategoryId?: number;
    type?: string;
    groupId?: number;
  }): Promise<BudgetComparison> => {
    const queryParams = new URLSearchParams();
    queryParams.append('year', params.year);
    if (params.month) queryParams.append('month', params.month.toString());
    if (params.subcategoryId) queryParams.append('subcategoryId', params.subcategoryId.toString());
    if (params.type) queryParams.append('type', params.type);
    if (params.groupId) queryParams.append('groupId', params.groupId.toString());
    
    const response = await api.get<BudgetComparison>(`/budgets/comparison?${queryParams.toString()}`);
    return response.data;
  },
};
