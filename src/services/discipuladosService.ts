import api from '@/lib/apiClient';
import { Discipulado } from '@/types';

export const discipuladosService = {
  getDiscipulados: async (filters?: { congregacaoId?: number; redeId?: number; discipuladorMemberId?: number; all?: boolean }): Promise<Discipulado[]> => {
    const params = new URLSearchParams();
    if (filters?.congregacaoId) params.append('congregacaoId', filters.congregacaoId.toString());
    if (filters?.redeId) params.append('redeId', filters.redeId.toString());
    if (filters?.discipuladorMemberId) params.append('discipuladorMemberId', filters.discipuladorMemberId.toString());
    if (filters?.all !== undefined) params.append('all', filters.all.toString());
    const queryString = params.toString();
    const res = await api.get<Discipulado[]>(`/discipulados${queryString ? `?${queryString}` : ''}`);
    return res.data;
  },

  createDiscipulado: async (data: { name: string; redeId: number; discipuladorMemberId?: number; discipleIds?: number[] }): Promise<Discipulado> => {
    const res = await api.post<Discipulado>('/discipulados', data);
    return res.data;
  },
  updateDiscipulado: async (id: number, data: { name?: string; redeId?: number; discipuladorMemberId?: number; discipleIds?: number[] }): Promise<Discipulado> => {
    const res = await api.put<Discipulado>(`/discipulados/${id}`, data);
    return res.data;
  },
  deleteDiscipulado: async (id: number): Promise<void> => {
    await api.delete(`/discipulados/${id}`);
  },
};

export default discipuladosService;
