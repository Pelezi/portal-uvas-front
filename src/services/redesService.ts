import api from '@/lib/apiClient';
import { Rede } from '@/types';

export const redesService = {
  getRedes: async (filters?: { congregacaoId?: number; pastorMemberId?: number; all?: boolean }): Promise<Rede[]> => {
    const params = new URLSearchParams();
    if (filters?.congregacaoId) params.append('congregacaoId', filters.congregacaoId.toString());
    if (filters?.pastorMemberId) params.append('pastorMemberId', filters.pastorMemberId.toString());
    if (filters?.all !== undefined) params.append('all', filters.all.toString());
    const queryString = params.toString();
    const res = await api.get<Rede[]>(`/redes${queryString ? `?${queryString}` : ''}`);
    return res.data;
  },

  createRede: async (data: { name: string; congregacaoId: number; pastorMemberId?: number; isKids?: boolean }): Promise<Rede> => {
    const res = await api.post<Rede>('/redes', data);
    return res.data;
  }
  ,
  updateRede: async (id: number, data: { name?: string; congregacaoId?: number; pastorMemberId?: number; isKids?: boolean }): Promise<Rede> => {
    const res = await api.put<Rede>(`/redes/${id}`, data);
    return res.data;
  }
  ,
  deleteRede: async (id: number): Promise<void> => {
    await api.delete(`/redes/${id}`);
  }
};

export default redesService;
