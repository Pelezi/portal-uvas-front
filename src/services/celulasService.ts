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

  createCelula: async (data: { 
    name: string; 
    leaderMemberId?: number; 
    discipuladoId?: number;
    leaderInTrainingIds?: number[];
    weekday?: number;
    time?: string;
    country?: string;
    zipCode?: string;
    street?: string;
    streetNumber?: string;
    neighborhood?: string;
    city?: string;
    complement?: string;
    state?: string;
  }): Promise<Celula> => {
    const res = await api.post<Celula>('/celulas', data);
    return res.data;
  },

  updateCelula: async (id: number, data: { 
    name?: string; 
    leaderMemberId?: number; 
    discipuladoId?: number;
    leaderInTrainingIds?: number[];
    weekday?: number;
    time?: string;
    country?: string;
    zipCode?: string;
    street?: string;
    streetNumber?: string;
    neighborhood?: string;
    city?: string;
    complement?: string;
    state?: string;
  }): Promise<Celula> => {
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
      newLeaderMemberId?: number;
      oldLeaderMemberId?: number;
    }
  ): Promise<void> => {
    await api.post(`/celulas/${id}/multiply`, data);
  },
};
