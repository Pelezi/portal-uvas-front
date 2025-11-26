import api from '@/lib/apiClient';
import { Celula } from '@/types';

export const celulasService = {
  getCelulas: async (): Promise<Celula[]> => {
    const res = await api.get<Celula[]>('/celulas');
    return res.data;
  },

  getCelula: async (id: number): Promise<Celula> => {
    const res = await api.get<Celula>(`/celulas/${id}`);
    return res.data;
  },

  createCelula: async (data: { name: string; leaderUserId?: number; discipuladoId?: number }): Promise<Celula> => {
    const res = await api.post<Celula>('/celulas', data);
    return res.data;
  },

  updateCelula: async (id: number, data: { name?: string; leaderUserId?: number }): Promise<Celula> => {
    const res = await api.put<Celula>(`/celulas/${id}`, data);
    return res.data;
  },

  deleteCelula: async (id: number): Promise<void> => {
    await api.delete(`/celulas/${id}`);
  },

  multiplyCelula: async (
    id: number,
    data: {
      memberIds: number[];
      newCelulaName: string;
      newLeaderUserId?: number;
      oldLeaderUserId?: number;
    }
  ): Promise<void> => {
    await api.post(`/celulas/${id}/multiply`, data);
  },
};
