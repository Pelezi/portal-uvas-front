import api from '@/lib/apiClient';
import { Account, AccountBalance, AccountType } from '@/types';

export const accountService = {
  getAll: async (params?: {
    groupId?: number;
  }): Promise<Account[]> => {
    const queryParams = new URLSearchParams();
    if (params?.groupId) queryParams.append('groupId', params.groupId.toString());
    
    const queryString = queryParams.toString();
    const url = queryString ? `/accounts?${queryString}` : '/accounts';
    const response = await api.get<Account[]>(url);
    return response.data;
  },

  getById: async (id: number): Promise<Account> => {
    const response = await api.get<Account>(`/accounts/${id}`);
    return response.data;
  },

  getCurrentBalance: async (id: number): Promise<AccountBalance | null> => {
    const response = await api.get<AccountBalance | null>(`/accounts/${id}/balance`);
    return response.data;
  },

  getBalanceHistory: async (id: number): Promise<AccountBalance[]> => {
    const response = await api.get<AccountBalance[]>(`/accounts/${id}/balance/history`);
    return response.data;
  },

  create: async (data: {
    name: string;
    type: AccountType;
    groupId?: number;
    initialBalance?: number;
    subcategoryId?: number;
    creditDueDay?: number;
    creditClosingDay?: number;
    debitMethod?: 'INVOICE' | 'PER_PURCHASE';
  }): Promise<Account> => {
    const response = await api.post<Account>('/accounts', data);
    return response.data;
  },

  update: async (id: number, data: {
    name?: string;
    type?: AccountType;
    groupId?: number;
    subcategoryId?: number | null;
    creditDueDay?: number | null;
    creditClosingDay?: number | null;
    debitMethod?: 'INVOICE' | 'PER_PURCHASE' | null;
  }): Promise<Account> => {
    const response = await api.put<Account>(`/accounts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounts/${id}`);
  },

  // Delete with force option (delete transactions and balances)
  deleteWithForce: async (id: number): Promise<void> => {
    await api.delete(`/accounts/${id}?force=true`);
  },

  getTransactionCount: async (id: number): Promise<number> => {
    const response = await api.get<{ count: number }>(`/accounts/${id}/transactions/count`);
    return response.data.count;
  },

  moveTransactions: async (id: number, targetAccountId: number): Promise<{ movedOrigin: number; movedDestination: number }> => {
    const response = await api.post<{ movedOrigin: number; movedDestination: number }>(`/accounts/${id}/transactions/move`, { targetAccountId });
    return response.data;
  },

  addBalance: async (data: {
    accountId: number;
    amount: number;
    date?: Date;
  }): Promise<AccountBalance> => {
    const response = await api.post<AccountBalance>('/accounts/balances', data);
    return response.data;
  },

  updateBalance: async (id: number, data: {
    amount?: number;
    date?: Date;
  }): Promise<AccountBalance> => {
    const response = await api.put<AccountBalance>(`/accounts/balances/${id}`, data);
    return response.data;
  },

  deleteBalance: async (id: number): Promise<void> => {
    await api.delete(`/accounts/balances/${id}`);
  },
};
