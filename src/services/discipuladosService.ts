import api from '@/lib/apiClient';
import { Discipulado } from '@/types';

export const discipuladosService = {
  getDiscipulados: async (): Promise<Discipulado[]> => {
    const res = await api.get<Discipulado[]>('/discipulados');
    return res.data;
  },

  createDiscipulado: async (data: { name: string; redeId: number; discipuladorMemberId?: number }): Promise<Discipulado> => {
    const res = await api.post<Discipulado>('/discipulados', data);
    return res.data;
  },
  updateDiscipulado: async (id: number, data: { name?: string; redeId?: number; discipuladorMemberId?: number }): Promise<Discipulado> => {
    const res = await api.put<Discipulado>(`/discipulados/${id}`, data);
    return res.data;
  },
  deleteDiscipulado: async (id: number): Promise<void> => {
    await api.delete(`/discipulados/${id}`);
  },
};

export default discipuladosService;
