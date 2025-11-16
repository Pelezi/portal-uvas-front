import api from '@/lib/apiClient';
import { Budget } from '@/types';

export const expenseService = {
  getAll: async (year: string): Promise<Budget[]> => {
    const response = await api.get<Budget[]>(`/expenses?year=${year}`);
    return response.data;
  },
};
