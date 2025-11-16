import api from '@/lib/apiClient';
import { Transaction, TransactionAggregated } from '@/types';

export const transactionService = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    categoryId?: number;
    subcategoryId?: number;
    accountId?: number;
    groupId?: number;
  }): Promise<Transaction[]> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId.toString());
    if (params?.subcategoryId) queryParams.append('subcategoryId', params.subcategoryId.toString());
    if (params?.accountId) queryParams.append('accountId', params.accountId.toString());
    if (params?.groupId) queryParams.append('groupId', params.groupId.toString());
    
    const queryString = queryParams.toString();
    const url = queryString ? `/transactions?${queryString}` : '/transactions';
    const response = await api.get<Transaction[]>(url);
    return response.data;
  },

  getById: async (id: number): Promise<Transaction> => {
    const response = await api.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  create: async (data: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const response = await api.post<Transaction>('/transactions', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Transaction>): Promise<Transaction> => {
    const response = await api.put<Transaction>(`/transactions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/transactions/${id}`);
  },

  getAggregated: async (year: number, month?: number, groupId?: number): Promise<TransactionAggregated[]> => {
    const params = new URLSearchParams();
    params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    if (groupId) params.append('groupId', groupId.toString());
    const response = await api.get<TransactionAggregated[]>(`/transactions/aggregated?${params.toString()}`);
    return response.data;
  },
};
